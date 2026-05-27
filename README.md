# Comparat'air

Comparat'air est un projet réalisé dans le cadre d'un PFE entre ICC, HPDA et CS.
Le but de Comparat'air est de permettre aux utilisateurs de pouvoir rechercher un vol, simplement et clairement
Le site est accessible sur : **https://comparatair.vercel.app/** */ mais il est possible de lancer le projet en local (voir Installation)

## Backend FastAPI

API REST Backend de notre application. Elle est développée en **Python** avec le framework **FastAPI**. L'api gere la logique métier, l'authentification des utilisateurs et fourni des données au Frontend.

## FrontEnd

Le frontend de l'application est un frontend en reactJS avec tailwindcss en framework css. Il permet le lien entre les actions utilisateurs et le backend.

## Fonctionnalités actuelles

- **Authentification basique** : Routes pour l'inscription (`POST /register`) et la connexion (`POST /login`).
- **Recherche de vol** : Possibilité de rechercher des vols avec un aéroport d'arrivée, un prix maximal, un nombre de personne et une date.
- **Like** : Possiblité de like un vol. Cela le rajoute aux favoris des utilisateurs et ils peuvent retrouver le vol plus facilement dans l'onglet like.
- **Suivi de prix** : Un vol like est enregistré dans la BDD, lorsqu'il y a une différence entre le prix enregistré dans la BDD et le prix de l'api, un mail est envoyé à l'utilisateur pour le notifier du changement de prix.
- **Jauge de prix et éco score** : Chaque prix est jaugé en fonction d'un historique réalisé afin que l'utilisateur sache comment jauger le prix. De plus, un indice d'éco score est donné afin d'informer l'utilisateur de la consommation du vol.
- **Admin** : Pour l'admin, des graphiques donnent des informations sur le nombre d'utilisateurs, les vols les plus like etc... 

## Prérequis
- **Python 3.8** ou une version supérieure 

## Installation

### Backend

1. Dans un terminal, déplacez vous jusqu'au back:

   ```bash
   cd app/back
   ```

2. (Recommendé) Si vous souhaitez un environnement virtuel :

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Installez toutes les dépendances listées dans le fichier de configuration :

   ```bash
   pip install -r requirements.txt
   ```

4. Lancez le back :

   ```bash
   uvicorn main:app --reload
   ```

L'API sera active et écoutera les requêtes à l'adresse : **http://127.0.0.1:8000**


### Frontend

1. Dans un terminal, déplacez vous jusqu'au front:

   ```bash
   cd app/front
   ```

2. Installer les dépendances:

   ```bash
   npm install
   ```

3.  Lancez le front :

   ```bash
   npm run dev
   ```

## Documentation de l'API 

L'un des grands avantages de FastAPI est sa documentation auto-générée. Une fois le serveur lancé, vous pouvez voir la liste de vos routes et les tester directement depuis votre navigateur en visitant :

 **http://127.0.0.1:8000/docs**
