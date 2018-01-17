FROM ubuntu:17.04
RUN apt-get update -y
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:certbot/certbot
RUN apt-get update -y
RUN apt-get install -y python-certbot-nginx
COPY crontab /etc/cron.d/letsencrypt-cron
RUN chmod 0644 /etc/cron.d/letsencrypt-cron
CMD cron && tail -f /dev/null
