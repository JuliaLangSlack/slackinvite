FROM ubuntu:17.04
RUN apt-get update -y
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:certbot/certbot
RUN apt-get update -y
RUN apt-get install -y python-certbot-nginx

CMD tail -f /dev/null
