module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accountResponse = await fetch(
      "https://mastodon.social/api/v1/accounts/lookup?acct=bhagwalkharian"
    );

    if (!accountResponse.ok) {
      throw new Error("Could not find Mastodon account");
    }

    const account = await accountResponse.json();

    const postsResponse = await fetch(
      `https://mastodon.social/api/v1/accounts/${account.id}/statuses?limit=5&exclude_reblogs=true`
    );

    if (!postsResponse.ok) {
      throw new Error("Could not load Mastodon posts");
    }

    const posts = await postsResponse.json();

    return res.status(200).json({
      platform: "Mastodon",
      account: account.url,
      items: posts.map(post => ({
        id: post.id,
        url: post.url,
        content: post.content,
        created_at: post.created_at,
        media: post.media_attachments.map(media => ({
          type: media.type,
          url: media.url,
          preview_url: media.preview_url
        }))
      }))
    });
  } catch (error) {
    return res.status(502).json({
      platform: "Mastodon",
      error: error.message
    });
  }
};
