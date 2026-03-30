# Frontend React

Interface Frontend de notre application. Il est construit avec **React**, **Vite** et **React Router**. Il est conçu pour communiquer de manière asynchrone avec une API **FastAPI** (Backend).

## 🚀 Fonctionnalités

- **Routage côté client** : `react-router-dom`
- **Page de connexion** `/login` : Formulaire gérant l'authentification
- **Page d'accueil** `/menu` : Route protégée, accessible uniquement si la connexion à l'API a réussi.
- **Appels API** : Communication avec le Backend via l'interface `fetch` standard de Javascript.

## 🛠️ Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** (version 18 ou supérieure recommandée).
- Le **Backend FastAPI** correspondant. Ce dernier doit être lancé en parallèle sur le port `8000` avec la configuration CORS adéquate pour autoriser les requêtes de ce Frontend.

## 📦 Installation

1. Ouvrez un terminal et placez-vous dans le dossier du projet React :
   ```bash
   cd app/front
   ```
2. Installez toutes les dépendances nécessaires (React, React Router, etc.) :
   ```bash
   npm install
   ```

## 💻 Démarrage local (Développement)

Pour lancer le serveur de développement ultra-rapide de Vite, exécutez la commande suivante :

```bash
npm run dev
```

L'application sera alors accessible dans votre navigateur, généralement à l'adresse : **http://localhost:5173**

> **⚠️ Important :** N'oubliez pas de lancer votre API FastAPI dans un autre terminal (`uvicorn main:app --reload`) pour que la connexion puisse aboutir

## 🔗 Configuration de l'API

Par défaut, ce Frontend pointe vers l'API locale en dur dans le code.
Les requêtes d'authentification sont envoyées à : `http://127.0.0.1:8000/login`

_(Dans une version future ou pour la mise en production, ces URL devront être extraites vers un fichier d'environnement `.env`)._
