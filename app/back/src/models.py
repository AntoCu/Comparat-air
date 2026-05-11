from typing import List
from pydantic import BaseModel


class FlightLikeRequest(BaseModel):
    user_id: int
    flight_id: str
    depart: str
    arrivee: str
    jour: str
    prix: float
    passagers: int
    eco_percent: int = 0


class FlightSearchRequest(BaseModel):
    departure: str
    date: str
    max_price: float
    passengers: int
    is_direct: bool = False


class UserRegister(BaseModel):
    email: str
    name: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class SearchRequest(BaseModel):
    query: str


class GroupFlightSearchRequest(BaseModel):
    departures: List[str]
    date: str
    max_price: float
    is_direct: bool = False
