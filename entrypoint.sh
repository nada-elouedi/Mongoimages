#!/bin/bash
chown -R mongodb:mongodb /data/db
exec gosu mongodb mongod --config /etc/mongod.conf --logpath=-

