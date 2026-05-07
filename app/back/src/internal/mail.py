import smtplib
from email.message import EmailMessage
from config import MAIL_USER, MAIL_PASSWORD

def send_price_drop_email(user_email: str, depart: str, arrivee: str, old_price: float, new_price: float):
    if not MAIL_USER or not MAIL_PASSWORD:
        print("⚠️ E-mail non envoyé : Identifiants MAIL manquants")
        return

    sujet = f" Alerte SkyStream : Baisse de prix pour votre vol vers {arrivee} !"
    economie = round(old_price - new_price, 2)
    
    contenu_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <div style="max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; text-align: center;">
                <h1 style="color: #0ea5e9;">SkyStream ✈️</h1>
                <h2>Bonne nouvelle pour votre vol {depart} ➔ {arrivee} !</h2>
                <p style="font-size: 16px;">Le prix vient de chuter. C'est peut-être le moment de réserver.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b; text-decoration: line-through;">Ancien prix : {old_price} €</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #10b981;">Nouveau prix : {new_price} €</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #0ea5e9;">Vous économisez {economie} € ! 🎉</p>
                </div>
            </div>
        </body>
    </html>
    """

    msg = EmailMessage()
    msg['Subject'] = sujet
    msg['From'] = f"SkyStream Tracker <{MAIL_USER}>"
    msg['To'] = user_email
    msg.set_content("Veuillez activer le HTML pour voir cet e-mail.")
    msg.add_alternative(contenu_html, subtype='html')

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_USER, MAIL_PASSWORD)
            server.send_message(msg)
        print(f" Alerte prix envoyée avec succès à {user_email} !")
    except Exception as e:
        print(f" Erreur lors de l'envoi de l'e-mail : {e}")