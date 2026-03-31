# Setup Serveur Wazuh

**Objectif :** Installation du serveur Wazuh (SIEM/EDR) pour centraliser les logs et détecter les attaques sur l'API de tracking (SQLi, Brute force).

### Configuration de la VM
- **OS :** Ubuntu 22.04 LTS
- **Ressources :** 4 Go RAM / 2 CPUs
- **Réseau :** IP `10.0.2.15`

### Installation rapide
Le serveur a été déployé avec le script automatique officiel :
1. `curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh`
2. `sudo bash wazuh-install.sh -a`

### Accès Dashboard
- **URL :** `https://10.0.2.15`
- **User :** `admin`
- **Password :** `[STORED IN SECURE VAULT / SEE .ENV]`
