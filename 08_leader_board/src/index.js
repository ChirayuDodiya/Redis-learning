import express from 'express'
import Redis from 'ioredis'

const app=express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
const LEADERBOARD_KEY='leaderboard'

// POST: post/:id/view ->increment view count of a post ->use incr
app.post('/post/:id/view',async(req,res)=>{
    const {id} = req.params;
    await redis.incr(`post:${id}:views`);
    const views = await redis.get(`post:${id}:views`)
    res.json({message:'view count incremented',views})
});


// ------------------ ------------------ ------------------ ------------------


// POST: /leaderboard/score->add points to a user score(get user id and score via request body) ->use zincrby
app.post('/leaderboard/score',async(req,res)=>{
    const {userId,score}= req.body;
    await redis.zincrby(LEADERBOARD_KEY,score,userId);
    const newScore = await redis.zscore(LEADERBOARD_KEY,userId);
    res.json({message:'score added successfully',newScore})
})

// GET: /leaderboard ->get top 10 leaders ->use zrevrange
app.get('/leaderboard',async(req,res)=>{
    const leaderboard = await redis.zrevrange(LEADERBOARD_KEY,0,9);

    const pipeline = redis.pipeline();
    
    for(const userId of leaderboard){
        pipeline.zscore(LEADERBOARD_KEY,userId);
    }

    const scores = await pipeline.exec();
    const leaderboardWithScores = leaderboard.map((userId,index)=>{
        return {
            userId,
            score:scores[index][1]
        }
    })

    res.json(leaderboardWithScores);//prints array of user ids
})

// GET: /leaderboard/:userId/rank ->get rank of a user ->use zrevrank
app.get('/leaderboard/:userId/rank',async(req,res)=>{
    const {userId}=req.params;
    const rank = await redis.zrevrank(LEADERBOARD_KEY,userId);//returns 0 based ranking
    res.json({rank});
})


app.listen(3000,()=>{
    console.log(`server started on http://localhost:3000`)
})