import QRCode from "qrcode";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const click_slug = searchParams.get("click_slug");
  const format = (searchParams.get("format") || "svg").toLowerCase(); // svg | png
  const sizeParam = searchParams.get("size"); // px for png

  if (!click_slug) {
    return new Response("Missing click_slug", { status: 400 });
  }

  // Always encode YOUR attribution URL
  const url = `https://ads4good.com/attribution/${encodeURIComponent(click_slug)}`;

  // QR settings: good defaults for print
  const qrOptions = {
    errorCorrectionLevel: "M", // good balance; "Q" is more robust but denser
    margin: 2, // quiet zone
  };

  if (format === "png") {
    const size = Number(sizeParam || 600); // default good for 1" print workflows
    const png = await QRCode.toBuffer(url, {
      ...qrOptions,
      type: "png",
      width: size,
    });

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  }

  // Default: SVG (best for print)
  const svg = await QRCode.toString(url, {
    ...qrOptions,
    type: "svg",
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
