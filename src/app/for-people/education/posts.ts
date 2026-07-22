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
  metaTitle?: string; // custom <title> lead → "<metaTitle> | ads for Good blog"; falls back to title
  category: BlogCategory;
  date: string;       // display date, e.g. "Jul 22, 2026"
  excerpt: string;    // 1–2 lines for the tile + meta description
  image?: string;     // optional tile image (e.g. "/images/DigitalAuditWallpaper.png"); falls back to a placeholder
  body: string;       // markdown
};

// One default tile image per category (the "category images"). A post can
// override with its own `image`.
export const CATEGORY_IMAGES: Record<BlogCategory, string> = {
  "Attribution Fundamentals": "/images/DigitalAuditWallpaper.png",
  "Data & Tracking": "/images/PrivacyProtectionWallpaper.png",
  "Measurement Strategy": "/images/MarketingGuidebookWallpaper.png",
};

export function postImage(post: Post): string {
  return post.image ?? CATEGORY_IMAGES[post.category];
}

export const POSTS: Post[] = [
  {
    slug: "why-your-marketing-reports-never-agree",
    title: "Why your marketing reports never agree with each other",
    metaTitle: "Attribution Fundamentals",
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
  {
    slug: "what-is-a-conversion",
    title: "What actually counts as a conversion (and why your tools can't agree on it)",
    metaTitle: "What is a Conversion",
    category: "Attribution Fundamentals",
    date: "Jul 22, 2026",
    excerpt:
      "A conversion is just an action you decided to count — and that decision quietly shapes every number you trust. What actually counts, why your tools disagree, and why your totals never match your real orders.",
    body: `Everyone in marketing talks about conversions like the word means one obvious thing. It doesn't. A conversion is just an action you've decided is worth counting — and the moment you look closely, that decision turns out to be doing a lot of quiet work behind every number you trust.

This matters more than it sounds. If you don't know exactly what your tools are counting as a conversion — and whether they're counting the same ones — you're comparing numbers that were never the same thing to begin with. Let's clear it up in plain English.

## A conversion is a decision, not a fact

A conversion is any action you've defined as a goal: a purchase, a lead form, a signup, a phone call, an add-to-cart. That's it. There's no universal list. A conversion for a store is a sale; a conversion for a law firm is a booked consultation; a conversion for an app is a signup.

Which means the first question isn't "how many conversions did we get?" It's "what did we decide to call a conversion?" Two businesses running the same ad can report wildly different results purely because they drew that line in different places. And one business running two tools can get two different counts because each tool was set up to watch for something slightly different.

## Big conversions and small ones: macro vs. micro

Not every meaningful action is a sale. Marketers split them into macro conversions — the big outcome you actually care about, like a purchase — and micro conversions, the smaller steps that lead there: signing up for emails, adding to cart, watching a demo, downloading a guide.

Micro conversions are useful because they show you where people are moving toward a sale before they buy. But they're also where counting gets messy. If your reporting lumps a newsletter signup in with a purchase, your "conversion" number is mixing a $0 action with a $200 one. Knowing which is which is the difference between a number that guides decisions and a number that flatters them.

## The conversions you can't see happen: view-through

Here's one that quietly inflates reports. A view-through conversion is when someone sees an ad — doesn't click it — and later buys anyway. The platform that showed the ad often takes credit for that sale, on the logic that the impression may have influenced them.

Sometimes it did. Sometimes the person was going to buy regardless and the ad just happened to flash by. View-through counting is where a lot of "this channel is crushing it" numbers come from — and it's worth knowing when a platform is claiming credit for a click that never happened.

## Assisted conversions: the credit nobody sees

The flip side of view-through is the assisted conversion — a touch that helped along the way but wasn't the final step before the sale. The email that brought someone back last week. The blog post that first introduced them. In a last-click world, these get zero credit, even though the sale doesn't happen without them.

Assisted conversions are where "what counts as a conversion" runs straight into attribution — because now you're not just counting the sale, you're deciding which of the touches before it deserve a share of the credit. That's a whole topic of its own, and it's exactly what [our guide to how attribution actually works](http://ads4good.com/for-people/education/why-your-marketing-reports-never-agree) gets into.

## The same sale, counted twice: duplicate conversions

Now the problem that breaks totals. A duplicate conversion is one real sale that gets counted more than once — because two tools both saw it, or the tracking fired twice, or the same customer was recorded as two people on two devices.

This is why adding up your platforms never matches your actual orders. Facebook counts the sale. Google counts the sale. Your analytics counts the sale. One purchase, three tallies. The customer didn't buy three times — your tools just each raised their hand for the same event. If you've ever wondered why your reported conversions are higher than your real order count, this is usually where it starts: the same person, the same sale, counted as many.

## Conversion lag: the sale that shows up late

One more wrinkle. Conversion lag is the gap between the first touch and the actual purchase. Someone sees your ad today and buys three weeks from now. If you check your report tomorrow, that sale doesn't exist yet — and the channel that earned it looks weaker than it is, purely because the customer took their time.

Long consideration cycles make this worse. The more expensive or considered the purchase, the longer the lag, and the more your early reports understate what's working.

## So what do you do with all this?

You don't need to track every flavor of conversion perfectly. You need to know which one you're looking at, so you stop comparing things that were never the same:

- **Define your conversion on purpose.** Know exactly which action counts, and whether micro and macro actions are mixed in the same number.
- **Ask whether credit came from a click or a view.** View-through inflates; know when a platform is claiming an impression as a win.
- **Expect duplicates when you add tools together.** Matching totals across platforms is a sign of double-counting, not accuracy.
- **Give slow sales time.** A channel with long conversion lag isn't underperforming; it's waiting.

Underneath all of it is one problem: your tools are each counting their own slice, and the same customer keeps showing up in more than one of them. That's the thing we built [Chapter](https://chapter.ads4good.com/) to fix — resolving the customer to one identity first, so a conversion gets counted once, by the person who actually made it. Count people, not sessions, and most of these headaches quietly go away.`,
  },
  {
    slug: "attribution-models-compared",
    title: "The attribution models, compared — and what each one quietly gets wrong",
    metaTitle: "Attribution Models Compared",
    category: "Attribution Fundamentals",
    date: "Jul 22, 2026",
    excerpt:
      "Change the model, change the hero. There's no “correct” attribution model — each is just a rule for splitting credit, and each is blind to something. A plain-English tour of last-click, first-click, linear, time-decay, and data-driven, and what each one gets wrong.",
    body: `If you've ever changed an "attribution model" setting in an ad platform and watched your numbers move, you've felt how much these models matter. Same sales, same month, different model — and suddenly a different channel is the hero.

There's no single "correct" model, because each one is just a rule for splitting credit, and every rule makes a tradeoff. The useful thing isn't picking the "right" one — it's knowing what each model sees clearly and what it's blind to. Here's the plain-English tour. (For the bigger picture of why credit is a decision and not a fact, start with [our guide to how attribution actually works](http://ads4good.com/for-people/education/why-your-marketing-reports-never-agree).)

## Last-click attribution: simple, popular, and quietly misleading

**What it does:** gives 100% of the credit to the last thing the customer clicked before buying.

**Why people use it:** it's the easiest to measure and it's the default in most tools. If you've never changed your model, this is almost certainly the one you're running.

**What it gets wrong:** everything that happened before the last click. The ad that introduced the customer, the email that brought them back, the content that built the trust — all of it gets zero. Last-click doesn't just favor the final step; it erases every step before it. That's why awareness channels so often look weak: they rarely get to be the last click, so a last-click model makes them look like they do nothing, when they may be doing the most important work at the start.

## First-click attribution: the opposite blind spot

**What it does:** gives 100% of the credit to the first touch that brought the customer in.

**Why people use it:** it rewards whatever fills the top of the funnel, so it's popular with teams focused on finding new customers.

**What it gets wrong:** it makes the mirror-image mistake of last-click. It hands the whole prize to the introduction and ignores everything that actually closed the deal — the follow-ups, the reminders, the final nudge. First-click over-credits discovery; last-click over-credits closing. Neither tells you what the middle did.

## Linear attribution: fair, and a little too polite

**What it does:** splits the credit evenly across every touch. Four touches, each gets 25%.

**Why people use it:** it stops any single channel from hogging the credit and at least acknowledges the whole journey.

**What it gets wrong:** it pretends every touch mattered equally, which is almost never true. The ad someone half-noticed three weeks ago and the email they opened an hour before buying get the exact same credit. Fairness isn't the same as accuracy — linear is fair to the point of being uninformative.

## Time-decay attribution: recency, for better and worse

**What it does:** gives more credit to touches closer to the sale, less to earlier ones.

**Why people use it:** it matches the intuition that the nudges right before a purchase did more of the closing work.

**What it gets wrong:** it systematically under-credits the touches that start journeys. For a long or considered purchase, the thing that first put you on the customer's radar might be the most valuable moment of all — and time-decay quietly discounts it precisely because it happened early.

## Data-driven attribution: better, but not a crystal ball

**What it does:** uses your own conversion data to assign credit based on patterns, rather than a fixed rule.

**Why people use it:** it's the most sophisticated option most platforms offer, and it adapts to how your customers actually behave.

**What it gets wrong:** two things worth knowing. First, it's only as good as the data feeding it — and if that data can't see the whole journey (the platform still can't watch touches on channels it doesn't own), the model is drawing patterns from a partial picture. Second, "data-driven" gets read as "objective truth," when it's still a model making estimates. Better inputs, better method — but not certainty, and not a substitute for seeing the actual path a customer took.

## The thing every model shares

Notice the pattern. Every model is a different way of dividing credit — and every one of them can only divide the credit it can see. If a platform can't see the email, the affiliate, the offline call, or the same customer arriving on a second device, then no model it runs will account for those, no matter how clever the math.

That's the real ceiling. The model debate — last-click vs. multi-touch vs. data-driven — is a debate about how to slice a picture that's already incomplete. Which is why the more useful question isn't "which model?" but "what is the model not seeing?"

## How to actually use this

- **Know your default.** If you never chose a model, you're on last-click, and you're under-crediting everything that starts journeys.
- **Match the model to the question.** First-click for "what brings people in," last-click for "what closes," multi-touch for "what's the whole path." Don't expect one to answer all three.
- **Treat data-driven as strong, not sacred.** It's the best of the built-in options and still only sees what its platform sees.
- **Ask what's missing before you trust the split.** A model applied to partial data gives you a confident answer to the wrong question.

The fix for the ceiling isn't a better slicing rule — it's a more complete picture to slice. That's what we built [Chapter](https://chapter.ads4good.com/) to do: resolve the customer to one identity across every touch and device first, so whichever model you then choose is dividing credit across the whole journey instead of the slice one platform happened to witness. Pick your model second. See the whole path first.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
