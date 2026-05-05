import secrets
from src.models import FlightSearchRequest

async def fetch_airport(client, dest: str, search: FlightSearchRequest, rapidapi_key: str):
    url = "https://google-flights2.p.rapidapi.com/api/v1/searchFlights"
    querystring = {
        "departure_id": search.departure, "arrival_id": dest,
        "outbound_date": search.date, "adults": search.passengers, "currency": "EUR"
    }
    headers = {"X-RapidAPI-Key": rapidapi_key, "X-RapidAPI-Host": "google-flights2.p.rapidapi.com"}

    try:
        response = await client.get(url, headers=headers, params=querystring, timeout=30.0)
        print(f"--- STATUS {response.status_code} POUR {dest} ---")

        if response.status_code == 200:
            data = response.json()
            itineraries = data.get("data", {}).get("itineraries", {})
            flights_list = itineraries.get("topFlights", []) + itineraries.get("otherFlights", [])
            dest_flights = []

            for option in flights_list:
                if search.is_direct and option.get("stops", 0) > 0:
                    continue

                price = option.get("price", 9999)
                if isinstance(price, dict):
                    price = price.get("raw", 9999)

                if price <= search.max_price:
                    segments = option.get("flights") or []
                    arrivee_nom, depart_code = dest, search.departure
                    
                    if segments:
                        if isinstance(segments[-1], dict):
                            arrivee_nom = segments[-1].get("arrival_airport", {}).get("airport_name", dest)
                        if isinstance(segments[0], dict):
                            depart_code = segments[0].get("departure_airport", {}).get("airport_code", search.departure)

                    carbon = option.get("carbon_emissions")
                    co2_kg, diff_percent, is_higher = 0, 0, False

                    if isinstance(carbon, dict):
                        co2_val = carbon.get("CO2e")
                        if isinstance(co2_val, (int, float)): 
                            co2_kg = int(co2_val / 1000)
                        diff_val = carbon.get("difference_percent")
                        if isinstance(diff_val, (int, float)): 
                            diff_percent = int(diff_val)
                        is_higher = "higher" in carbon

                    dest_flights.append({
                        "id": option.get("booking_token", secrets.token_hex(6)),
                        "depart": depart_code, "arrivee": arrivee_nom,
                        "horaire_depart": option.get("departure_time", "N/A"),
                        "horaire_arrivee": option.get("arrival_time", "N/A"),
                        "prix": price, "passagers": search.passengers,
                        "emissions_co2": co2_kg, "emissions_diff": diff_percent, "emissions_higher": is_higher
                    })
            return dest_flights
        return []
    except Exception as e:
        print(f"❌ Erreur critique pour {dest}: {type(e).__name__} - {str(e)}")
        return []