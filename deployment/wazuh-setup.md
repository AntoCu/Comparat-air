# Setup Serveur Wazuh

**Objectif :** Installation du serveur Wazuh (SIEM/EDR) pour centraliser les logs et détecter les attaques sur l'API de tracking (SQLi, Brute force).

### Configuration de la VM
- **OS :** Ubuntu 22.04 LTS
- **Ressources :** 4 Go RAM / 2 CPUs
- **Réseau :** IP `192.168.144.136`

### Installation rapide
Le serveur a été déployé avec le script automatique officiel :
1. `curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh`
2. `sudo bash wazuh-install.sh -a`

### Accès Dashboard
- **URL :** `https://192.168.144.136`
- **User :** `admin`
- **Password :** `[STORED IN SECURE VAULT / SEE .ENV]`

### Préparation des logs de l'application
Le backend FastAPI écrit les logs de sécurité dans :
- `/var/log/skystream/access.log`

Cette destination doit exister avant le démarrage du backend :
```bash
sudo mkdir -p /var/log/skystream
sudo chown "$(whoami)" /var/log/skystream
sudo chmod 750 /var/log/skystream
```

Ne comptez pas sur Wazuh pour créer ce dossier ou ce fichier automatiquement : il faut le préparer dans le déploiement de l'application.


### Configuration Wazuh agent pour collecter les logs
Sur l'agent qui surveille le serveur backend :

1. Ouvrez le fichier de configuration :
```bash
sudo nano /var/ossec/etc/ossec.conf
```

2. Cherchez la ligne `<address>...</address>` ou la variable `MANAGER_IP` et remplacez-la par l'adresse IP de votre manager Wazuh.

3. Ajoutez le bloc suivant dans la section des fichiers locaux, en bas du fichier :
```xml
<localfile>
  <log_format>json</log_format>
  <location>/var/log/skystream/access.log</location>
</localfile>
```

4. Enregistrez et fermez le fichier (`Ctrl+O`, `Entrée`, `Ctrl+X`).

5. Redémarrez l'agent Wazuh :
```bash
sudo systemctl restart wazuh-agent
```

6. Vérifiez que l'agent est bien connecté :
```bash
sudo systemctl status wazuh-agent
```

Si `agent_control` n'existe pas sur ton installation, utilise à la place :
```bash
sudo /var/ossec/bin/manage_agents -l
```
