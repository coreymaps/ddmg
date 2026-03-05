const { Storage } = require("@google-cloud/storage");
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let password;
  try {
    ({ password } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  if (!password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Password required" }),
    };
  }

  // Server-side password verification via SHA-256 hash comparison
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash !== process.env.DOWNLOAD_PASSWORD_HASH) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Incorrect password" }),
    };
  }

  // Initialize GCS with service account credentials
  let storage;
  try {
    const saKey = JSON.parse(
      Buffer.from(process.env.GCS_SA_KEY, "base64").toString()
    );
    storage = new Storage({
      projectId: saKey.project_id,
      credentials: saKey,
    });
  } catch (err) {
    console.error("Failed to initialize GCS:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  try {
    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: "downloads/" });

    // Group files by conflict_id (first path segment after downloads/)
    const datasets = {};
    const signPromises = [];

    for (const file of files) {
      const relPath = file.name.replace(/^downloads\//, "");
      const parts = relPath.split("/");
      // Skip directory markers and files not nested under a conflict_id
      if (parts.length < 2 || !parts[parts.length - 1]) continue;

      const conflictId = parts[0];
      const fileName = parts.slice(1).join("/");

      if (!datasets[conflictId]) datasets[conflictId] = [];

      const idx = datasets[conflictId].length;
      datasets[conflictId].push({
        name: fileName,
        url: null,
        size: parseInt(file.metadata.size, 10) || 0,
      });

      // Collect sign promises for parallel execution
      signPromises.push(
        file
          .getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + 60 * 60 * 1000, // 1 hour
          })
          .then(([url]) => {
            datasets[conflictId][idx].url = url;
          })
      );
    }

    await Promise.all(signPromises);

    // Sort files within each dataset alphabetically
    for (const id of Object.keys(datasets)) {
      datasets[id].sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasets }),
    };
  } catch (err) {
    console.error("GCS error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to list downloads" }),
    };
  }
};
