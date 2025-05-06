FROM mongo:6.0

# Copier un fichier mongod.conf personnalisé
COPY mongod.conf /etc/mongod.conf

# Créer les dossiers nécessaires
RUN mkdir -p /data/db /data/configdb

# Utiliser mongod avec le fichier de configuration
CMD ["mongod", "--config", "/etc/mongod.conf"]

