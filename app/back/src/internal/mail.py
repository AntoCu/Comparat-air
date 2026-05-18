import smtplib
from email.message import EmailMessage
from src.internal.config import MAIL_USER, MAIL_PASSWORD


def send_price_drop_email(
    user_email: str, depart: str, arrivee: str, old_price: float, new_price: float
):
    if not MAIL_USER or not MAIL_PASSWORD:
        print(" E-mail non envoyé : Identifiants MAIL manquants")
        return

    is_drop = new_price < old_price
    difference = round(abs(old_price - new_price), 2)

    if is_drop:
        sujet = f"Alerte Comparat'air : Baisse de prix pour votre vol vers {arrivee} !"
        titre = f"Bonne nouvelle pour votre vol {depart} ➔ {arrivee} !"
        sous_titre = "Le prix vient de chuter. C'est peut-être le moment de réserver."
        couleur_prix = "#10b981"  #
        texte_diff = f"Vous économisez {difference} € ! "
    else:
        sujet = f"Alerte Comparat'air : Hausse de prix pour votre vol vers {arrivee}"
        titre = f"Attention, le prix de votre vol {depart} ➔ {arrivee} a changé."
        sous_titre = "Le tarif a augmenté. Gardez un œil dessus pour ne pas rater la prochaine baisse !"
        couleur_prix = "#ef4444"
        texte_diff = f"Le prix a augmenté de {difference} € "

    contenu_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <div style="max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; text-align: center;">
                <h1 style="color: #0ea5e9;">Comparat'air ✈️</h1>
                <h2>{titre}</h2>
                <p style="font-size: 16px;">{sous_titre}</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748b; text-decoration: line-through;">Ancien prix : {old_price} €</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: {couleur_prix};">Nouveau prix : {new_price} €</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #0ea5e9;">{texte_diff}</p>
                </div>
            </div>
        </body>
    </html>
    """

    msg = EmailMessage()
    msg["Subject"] = sujet
    msg["From"] = f"Comparat'air Tracker <{MAIL_USER}>"
    msg["To"] = user_email
    msg.set_content("Veuillez activer le HTML pour voir cet e-mail.")
    msg.add_alternative(contenu_html, subtype="html")

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(MAIL_USER, MAIL_PASSWORD)
            server.send_message(msg)
        print(f" Alerte prix envoyée avec succès à {user_email} !")
    except Exception as e:
        print(f" Erreur lors de l'envoi de l'e-mail : {e}")
