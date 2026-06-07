import express from 'express';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function otpKey(phone) {
    return `otp:${phone}`;
};

app.post('/otp', async (req, res) => {
    const { phone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    await redis.set(otpKey(phone), otp, 'EX', 30); // otp valid for 30 sec
    res.json({ message: 'OTP sent', otp });
});

app.post('/otp/verify', async (req, res) => {
    const { phone, otp } = req.body;
    const savedOtp = await redis.get(otpKey(phone));

    if (!savedOtp) {
        return res.status(400).json({ message: 'OTP not found or expired' });
    }

    if (savedOtp !== otp) {
        return res.status(400).json({ message: 'OTP does not match' });
    }

    await redis.del(otpKey(phone)); // delete otp after verification
    res.json({ message: 'OTP verified successfully' });
});

app.get('/otp/:phone/ttl', async (req, res) => {
    const ttl = await redis.ttl(otpKey(req.params.phone));
    res.json({ ttl });
});


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})