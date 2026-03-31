# SkyStream Tracker

Cette application est composée d'un **Frontend React** (Vite) et d'un **Backend FastAPI**. Elle permet de suivre les flux de données aériennes en temps réel.

---

## Backend FastAPI

Le serveur gère la logique métier, le traitement des données et l'authentification.

### Prérequis (Back)
- **Python 3.10** ou supérieur.
- Un environnement virtuel est fortement recommandé pour isoler les dépendances.

### Installation & Démarrage (Back)

1.  **Placez-vous dans le dossier du Backend** :
    ```bash
    cd app/back
    ```

2.  **Créez et activez un environnement virtuel** :
    ```bash
    # Création
    python3 -m venv venv

    # Activation
    source venv/bin/activate
    ```

3.  **Installez les dépendances** :
    ```bash
    pip install -r requirements.txt
    ```

4.  **Lancez le serveur Uvicorn** :
    ```bash
    uvicorn main:app --reload
    ```
    *Le Backend sera accessible sur : **[http://127.0.0.1:8000](http://127.0.0.1:8000)***

---

## Frontend React

Interface utilisateur construite avec **React**, **Vite** et **React Router**.

### Fonctionnalités
- **Routage côté client** : `react-router-dom`
- **Page de connexion** `/login` : Formulaire gérant l'authentification.
- **Page d'accueil** `/menu` : Route protégée, accessible après connexion.
- **Appels API** : Communication asynchrone avec le Backend via `fetch`.

### Prérequis (Front)
- **Node.js** (version 18 ou supérieure).
- Le **Backend** doit être lancé en parallèle sur le port `8000`.

### Installation & Démarrage (Front)

1.  **Placez-vous dans le dossier du Frontend** :
    ```bash
    cd app/front
    ```

2.  **Installez les dépendances** :
    ```bash
    npm install
    ```

3.  **Lancez le serveur de développement** :
    ```bash
    npm run dev
    ```
    *L'application sera accessible sur : **http://localhost:5173***

---

## Configuration de l'API

Par défaut, le Frontend pointe vers l'API locale.
Les requêtes sont envoyées à : `http://127.0.0.1:8000/`

> **⚠️ Note importante :** Assurez-vous que le Backend est bien démarré avant de tenter une connexion sur le Frontend, sinon les appels API échoueront.