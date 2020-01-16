# Relevant

Address: [UNOS__VCYTkpd9bxvI5C8ATZw6qIc1SMYfA01v9rxIQ
](https://viewblock.io/arweave/address/UNOS__VCYTkpd9bxvI5C8ATZw6qIc1SMYfA01v9rxIQ)

It is a community permafeed aggregator powered by the Arweave, Hapi.js, and Vue with a twist of sentiment analysis.
You can explore posts using dates, terms. One cool thing is that the site will be colored red if the results have negative sentiment, and blue if the feed has a positive sentiment, also include a grey for neutral sentiment but I never see it.

Why this is interesting, well maybe you need to make a decision based on the current state of the ecosystem or maybe do you need to understand why the cryptocurrentins are falling down today, one week ago or since one year ago. So having this information and making more visible the perception of the sentiment, will help to gain knowledge, take a decision, stay updated with news that the community considered **relevant** or just having fun.


## Install dependencies

```
yarn install
```

The project stores info about the sites to haverst its feed, So we need to up mongo to store such data as following:
```
docker run -d -p 127.0.0.1:27017:27017 --name mongo mongo
```

## Run the server
Before start the permafeed agregator/app ensure you have enough funds to save posts/news to Arwaeave!
```
node main.js -w wallet.json -p 80 -H 0.0.0.0
```

If you have some error with respect to insecure content I recommend use certbot and nginx to configure ssl certificates. Go this site for more details: https://certbot.eff.org/lets-encrypt/ubuntubionic-nginx
Also, you can open an issue in this repo to provide this configuration.

**Run your instance and give them a thematic**
My instance is focusing on stay relevant in the crypto ecosystem adding news sites, technical posts from arweave medium, gitcoin blog , and so on.


## Funtionality
1. Add your feed url, the harvest of the seed takes one hour to search for new news. So maybe in an hour or less the site will start requesting your feed data.

![screenshots](/screenshots/add_feed.png)

As a side note, you can submit again your site to force harvest the feed.

2. Wait patiently or just have fun with the current posts.




## License
See [LICENSE](/LICENSE)
