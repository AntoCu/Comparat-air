# Backend FastAPI

API REST Backend de notre application. Il est développé en **Python** avec le framework **FastAPI**. Son rôle principal est de gérer la logique métier, l'authentification des utilisateurs et de fournir des données au Frontend (**React**).

## 🚀 Fonctionnalités actuelles

- **Authentification basique** : Routes pour l'inscription (`POST /register`) et la connexion (`POST /login`).
- **Base de données en mémoire** : Utilisation d'un dictionnaire Python pré-rempli pour simuler le stockage des utilisateurs, ce qui permet des tests immédiats sans configuration de base de données complexe.
- **CORS configuré** : Le middleware CORS est paramétré pour autoriser les requêtes provenant du Frontend React (typiquement sur le port `5173`).
- **Documentation automatique** : Génération d'une interface Swagger UI interactive pour visualiser et tester l'API.

## 🛠️ Prérequis

- **Python 3.8** ou une version supérieure installée sur votre système.

## 📦 Installation

1. Ouvrez un terminal et placez-vous dans le dossier de votre backend :

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

4. Lancez le projet :

   ```bash
   uvicorn main:app --reload
   ```

L'API sera active et écoutera les requêtes à l'adresse : **http://127.0.0.1:8000**

## 📖 Documentation de l'API (Swagger)

L'un des grands avantages de FastAPI est sa documentation auto-générée. Une fois le serveur lancé, vous pouvez voir la liste de vos routes et les tester directement depuis votre navigateur en visitant :

👉 **http://127.0.0.1:8000/docs**
