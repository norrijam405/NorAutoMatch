import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Strict maximum connection ceiling per instance container
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.post('/api/products', async (req: Request, res: Response): Promise<void> => {
  const { title, price, tags } = req.body;

  const client = await pool.connect();
  try {
    // Open explicit SQL transaction bounds
    await client.query('BEGIN');

    // 1. Write the primary application data record
    const productQuery = `
      INSERT INTO products (title, price, metadata)
      VALUES ($1, $2, $3)
      RETURNING id, title, price, metadata;
    `;
    const metadataStr = JSON.stringify({ tags, featured: true });
    const productResult = await client.query(productQuery, [title, price, metadataStr]);
    const product = productResult.rows[0];

    // 2. Write the task payload directly into the outbox table within the SAME transaction boundary
    const outboxQuery = `
      INSERT INTO outbox_tasks (event_type, payload)
      VALUES ($1, $2);
    `;
    const eventPayload = { id: product.id, title: product.title, price: product.price };
    await client.query(outboxQuery, ['product.created', JSON.stringify(eventPayload)]);

    // Atomic transaction commit: If this succeeds, BOTH records are permanently written.
    await client.query('COMMIT');

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('API Router execution context fault:', error);
    res.status(500).json({ success: false, error: 'Internal Transactional Resiliency Error' });
  } finally {
    client.release(); // Always release the client connection back to the global instance pool
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Outbox-protected backend engine online on port ${PORT}`));
