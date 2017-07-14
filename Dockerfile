FROM node:8.1.4
LABEL author="malmaud@gmail.com"
EXPOSE 4000

RUN mkdir /app
WORKDIR /app
RUN npm install --global forever
COPY yarn.lock package.json ./
RUN yarn install
COPY assets ./assets
COPY lib ./lib
COPY schema.graphql main.html ./

CMD npm run serve
