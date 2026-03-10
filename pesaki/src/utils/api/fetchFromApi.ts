import https from 'https';

const fetchFromApi = async (path: string) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: process.env.RAPIDAPI_HOST,
      path,
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': process.env.RAPIDAPI_HOST,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Uint8Array[] = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        resolve(JSON.parse(body));
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.end();
  });
};

export default fetchFromApi;