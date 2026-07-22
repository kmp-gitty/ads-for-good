// Blog post registry for the Education blog (/for-people/education).
//
// Each post is markdown — add a new entry here and it auto-appears on the hub
// (as a tile) and gets its own page at /for-people/education/<slug>.
// `body` is rendered by PostBody.tsx (react-markdown + styled components).

export type BlogCategory =
  | "Attribution Fundamentals"
  | "Data & Tracking"
  | "Measurement Strategy";

export type Post = {
  slug: string;
  title: string;
  category: BlogCategory;
  date: string;       // display date, e.g. "Jul 22, 2026"
  excerpt: string;    // 1–2 lines for the tile + meta description
  image?: string;     // optional hero image URL; falls back to a placeholder
  body: string;       // markdown
};

export const POSTS: Post[] = [
  {
    slug: "why-your-marketing-reports-never-agree",
    title: "Why your marketing reports never agree with each other",
    category: "Attribution Fundamentals",
    date: "Jul 22, 2026",
    excerpt:
      "Facebook says 50 sales. Google says 40. Email says 30. You had 60. Nobody's lying — everybody's counting. A plain-English look at attribution and why your reports never add up.",
    body: `If you run any kind of advertising, you've probably had this moment. Facebook says it drove 50 sales last month. Google says it drove 40. Your email tool claims 30. You add them up, get 120, then look at your actual orders and find… 60.

Nobody's lying. Everybody's counting. That's the whole problem.

The thing quietly breaking every one of those reports is called **attribution** — the question of which marketing gets *credit* for a sale. It sounds like a technical detail. It's actually the reason your numbers never add up, why two tools can both be "right" and still disagree, and why it's so hard to know what's actually working. So let's pull back the curtain on it, in plain English.

## What attribution actually is

Attribution is just credit assignment. A customer buys something. Before they bought, they probably ran into your business a few times — saw an Instagram ad, got an email, Googled you, clicked a link from a friend. Attribution is the system that decides which of those touches gets the credit for the sale.

Here's the catch that trips everyone up: **there is no single correct answer.** Credit isn't a fact sitting in your data waiting to be found. It's a decision you make about how to divide it up. Different tools make that decision differently, which is exactly why they disagree.

Imagine a customer who sees your Instagram ad on Monday, opens your email on Wednesday, and searches your name on Google before buying on Friday. Who earned that sale? Instagram introduced them. Email reminded them. Google was the last step. A reasonable person could argue for any of the three — and the different attribution models do exactly that.

## The two models everyone starts with: first touch and last touch

The two simplest ways to assign credit are the two ends of the journey.

**Last-touch** gives 100% of the credit to the final thing the customer did before buying. In our example, that's the Google search on Friday. This is the most common model in the world, because it's the easiest to measure — you just look at what happened right before the sale. It's also the default in most tools, which is why so many businesses unknowingly run on it.

**First-touch** does the opposite: 100% of the credit goes to the *first* thing that brought the customer in. Here, that's the Monday Instagram ad. This model is popular with people who care about finding new customers, because it rewards whatever fills the top of the funnel.

Both are simple. Both are useful. And both are, in an important sense, wrong — because both take a sale that *three* things contributed to and hand the entire prize to *one* of them. Last-touch ignores the ad that started everything. First-touch ignores the email and the search that closed it.

## Multi-touch: spreading the credit around

The obvious fix is to stop picking one winner and share the credit across every touch. That's **multi-touch attribution**, and it comes in a few flavors:

- **Linear** splits the credit evenly. Three touches, each gets a third. Simple and fair, but it pretends the first hello matters exactly as much as the final nudge, which usually isn't true.
- **Time-decay** gives more credit to the touches closer to the sale, on the theory that recent nudges did more of the closing.
- **Position-based** (often 40/20/40) rewards the first touch and the last touch most, treating "got them in the door" and "closed the deal" as the two big moments, with everything in the middle sharing the rest.

Multi-touch is more honest than picking a single winner. It's also harder to do, because now you need to actually see all the touches — and that's where most setups fall apart, which we'll come back to.

## Attribution windows: the hidden setting that changes everything

Here's a piece of the puzzle almost nobody outside the industry knows about, and it quietly rewrites your numbers: the **attribution window**.

A window is the amount of time a touch is allowed to "count." If a platform uses a 7-day window, it only takes credit for sales that happen within 7 days of someone clicking. A 30-day window counts sales up to a month later.

This matters enormously, and here's why: **change the window and you change the results, even though nothing about your actual business changed.** A 30-day window catches the customer who took three weeks to decide. A 7-day window misses that same sale entirely — and hands the credit to whatever happened later, inside the window. Same customer, same purchase, completely different report.

When two platforms report different numbers, mismatched windows are often the reason. Facebook and Google don't use the same defaults, don't count the same way, and each is only looking at its own touches inside its own window. Of course they disagree.

## Why the models disagree — and why that's normal

So why can four tools look at the same month and give you four different answers?

Because each tool is answering a slightly different question. Last-touch asks "what happened right before the sale?" First-touch asks "what brought them in?" Each platform only sees the touches it was involved in — Facebook can't see your emails, Google can't see your Instagram ads — and each counts inside its own window with its own rules.

None of them are lying. They're each telling you a partial truth from their own corner. The disagreement isn't a bug you can fix by finding the "right" tool. It's baked into the fact that a real customer journey is spread across many touches, and every tool only sees a slice of it.

That's the uncomfortable takeaway: **your attribution isn't broken because you picked the wrong model. It's limited because no single platform can see the whole journey.** Attribution can tell you the *direction* things are moving. It was never designed to be the precise, penny-accurate truth most dashboards present it as.

## So what do you actually do about it?

You don't need to give up on measurement. You need to stop expecting individual channel reports or disconnected dashboards to be your source of truth and start looking at a wider net of causes for a new customer, sale, submission, etc. A few simple principles:

- **Know which model you're looking at.** If you've never changed it, you're almost certainly on last-touch, which means you're systematically under-crediting everything that starts customer journeys — your ads, your content, your awareness.
- **Check the window.** Two reports that disagree may just be counting over different lengths of time.
- **Stop adding tools together.** Facebook's 50 plus Google's 40 isn't 90. They're double-counting the same customers, because the same person touched both.
- **Care most about the whole journey, not the last click.** The real question isn't "which touch gets credit?" It's "what actually moves people toward buying?" — and answering that means seeing the whole path a customer takes, not the slice any one platform shows you.

That last point is the hard one, and it's the reason we built [Chapter](https://chapter.ads4good.com/) — a way to stitch a real customer's whole journey back together across every touch, so you're measuring people and paths instead of arguing with four disagreeing dashboards. That's a bigger topic than one post. But it starts here, with understanding why the reports disagree in the first place: not because someone's wrong, but because everyone's only seeing part of the picture.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
