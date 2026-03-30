from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Autorise React (port 5173) à discuter avec FastAPI (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# bdd en memoire
users_db = {"test@test.com": "motdepasse123",
    "admin@admin.com": "admin",
    "john@doe.com": "azerty"
}

# Ce que l'utilisateur doit envoyer
class User(BaseModel):
    email: str
    password: str

@app.post("/register")
def register(user: User):
    # si email deja existant
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # enregistre user 
    # faut une fonction de hashage !
    users_db[user.email] = user.password
    
    return {"message": "Utilisateur créé", "email": user.email}

@app.post("/login")
def login(user: User):
    if user.email not in users_db:
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")
    
    if users_db[user.email] != user.password:
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")
    
    return {"message": "Connexion réussie !", "email": user.email}

