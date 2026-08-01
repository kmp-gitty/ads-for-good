// Blog post registry for the Education blog (/for-people/education).
//
// Each post is markdown — add a new entry here and it auto-appears on the hub
// (as a tile) and gets its own page at /for-people/education/<slug>.
// `body` is rendered by PostBody.tsx (react-markdown + styled components).

export type BlogCategory =
  | "Attribution Fundamentals"
  | "Data & Tracking"
  | "Measurement Strategy"
  | "Marketing Playbook";

export type Post = {
  slug: string;
  title: string;
  metaTitle?: string; // custom <title> lead → "<metaTitle> | ads for Good blog"; falls back to title. Keep it UNIQUE per post — never the category name.
  category: BlogCategory;
  date: string;       // display date, e.g. "Jul 22, 2026"
  excerpt: string;    // 1–2 lines for the tile + meta description
  image?: string;     // optional tile image (e.g. "/images/DigitalAuditWallpaper.png"); falls back to a placeholder
  body: string;       // markdown
  faqs?: { q: string; a: string }[]; // optional — rendered on-page + emitted as FAQPage JSON-LD
  publishAt?: string; // ISO date (e.g. "2026-08-03"). Hidden in production until this date; absent = live now. Always visible in dev so drafts can be reviewed locally.
};

// One default tile image per category (the "category images"). A post can
// override with its own `image`.
export const CATEGORY_IMAGES: Record<BlogCategory, string> = {
  "Attribution Fundamentals": "/images/DigitalAuditWallpaper.png",
  "Data & Tracking": "/images/PrivacyProtectionWallpaper.png",
  "Measurement Strategy": "/images/MarketingGuidebookWallpaper.png",
  "Marketing Playbook": "/images/OwnaBusinessWallpaper.png",
};

export function postImage(post: Post): string {
  return post.image ?? CATEGORY_IMAGES[post.category];
}

export const POSTS: Post[] = [
  {
    slug: "why-your-marketing-reports-never-agree",
    title: "Why your marketing reports never agree with each other",
    metaTitle: "Why Your Marketing Reports Never Agree",
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
    title: "Attribution models, compared — and what each one quietly gets wrong",
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
  {
    slug: "privy-alternatives",
    title: "The best Privy alternatives, honestly compared",
    metaTitle: "Best Privy Alternatives for Popups",
    category: "Marketing Playbook",
    date: "Jul 31, 2026",
    excerpt:
      "An honest look at the main Privy alternatives, what each is actually good at, and how to pick based on how you capture leads rather than on feature counts.",
    image: "/images/ConsultingWallpaper.png",
    body: `Every business that runs popups has the same quiet moment eventually. Privy has done its job for a while — you set up an exit offer, it caught some emails, life went on. Then something nudges you to look around. Maybe the price crept up as your list grew. Maybe you outgrew the templates, or you moved off Shopify and the deep integration you were paying for stopped being the point. Maybe you just want triggers smarter than "show after five seconds."

Whatever the reason, "Privy alternative" is one of those searches you run once and then drown in ten listicles that all recommend whatever tool paid for the placement. So here's an honest version: what Privy is genuinely good at, the real alternatives, and — the part most of these lists skip — how to pick based on how *you* capture leads instead of on who has the longest feature table.

## What Privy is actually good at

Start here, because it's easy to forget once you're shopping. **Privy is a mature, Shopify-native popup and email tool with a template library most competitors can't match and a free tier that genuinely works for a small store.** If you're on Shopify, you want to be running in an afternoon, and you don't want to think about it much, Privy earns its spot. A lot of "alternatives" content pretends the incumbent is bad. It isn't. It's just not the right shape for everyone, and it gets more expensive as your list grows.

The reasons people actually leave cluster around three things: **price at scale**, **wanting smarter triggering and real measurement**, and **running on something other than Shopify.** Keep whichever of those is yours in mind as you read — it's the thing that should decide this, not a feature count.

## The alternatives, one at a time

**OptiMonk** — best if you want deep on-site personalization and A/B testing. It leans into showing different messages to different segments and testing variants, which is powerful if you'll actually use it. The flip side: it's more tool than a simple store needs, and the learning curve and price reflect that.

**Justuno** — strong on ecommerce conversion features and audience targeting, popular with bigger Shopify and BigCommerce stores. Where it falls short is the same as OptiMonk: it's built for teams who'll invest time in it, and it can feel heavy for a one-person shop.

**Wisepops** — clean, modern, good-looking popups with a gentler learning curve. Best for brands that care about design and don't want the builder to fight them. Where it's weaker: it's focused more on the on-site popup than on being a full email-and-automation suite, so you'll pair it with an ESP.

**Poptin** — the value pick. A generous free tier and low paid plans make it the closest thing to a like-for-like Privy swap on price. The trade-off is that it's lighter on the advanced targeting and analytics the pricier tools compete on.

**Smart Prompts (ours)** — since this is our blog, here it is in the same format, no bigger section. Smart Prompts is [exit intent popup software](/for-businesses/smart-prompts) that fires on exit-intent, cart-abandon, scroll, time-on-page, or click, pairs with your own copy and an optional code, and logs a show-to-submit rate for every prompt so you can see what works. It runs on any site, not just Shopify, and it's built to work *alongside* the email platform you already send from rather than replace it. Where it falls short: it's newer, so the template gallery is smaller than Privy's, and if you want one tool that also sends your campaigns, that's not what it is — it's the capture-and-measure layer.

## How they actually compare

No all-checkmarks table here, because a column where one tool wins everything isn't real and you know it. The honest version:

- **Cheapest at scale:** Poptin, then Smart Prompts.
- **Biggest template library, fastest on Shopify:** Privy.
- **Deepest targeting and A/B testing:** OptiMonk and Justuno.
- **Best-looking out of the box:** Wisepops.
- **Smartest triggers plus per-prompt measurement, any platform:** Smart Prompts.
- **True all-in-one (popups *and* email sending):** Privy, and to a degree Justuno — the rest, us included, assume you keep your ESP.

Every one of those tools loses a row somewhere. That's the point.

## How to choose, by situation

Skip the feature checklist. Pick the sentence that sounds like you:

- **"I'm a small Shopify store and I just want it working today."** Stay on Privy, or try Poptin if price is the issue.
- **"My list got big and the bill got scary."** Poptin or Smart Prompts.
- **"I have a team and I'll actually run tests and segments."** OptiMonk or Justuno.
- **"I care how it looks and I'm not on Shopify."** Wisepops or Smart Prompts.
- **"I want to know which prompts actually earn signups, not just how many fired."** That measurement gap is exactly why we built Smart Prompts — but any of these beats guessing.

If you're still deciding what a *good* popup even looks like before you pick a tool, that's worth its own look — here are [email popup examples](/for-people/education/email-popup-examples) grouped by what triggers them.

Whatever you land on, the tool matters less than matching it to how you actually capture leads. And if the honest answer is "I want smarter triggers and real numbers on any platform," you can [start a free trial](/chapter/signup) and see your first show-to-submit rate this week.`,
    faqs: [
      {
        q: "What's the best free Privy alternative?",
        a: "Poptin has the most generous free tier of the like-for-like swaps; Smart Prompts and Wisepops also offer free or trial access. The right free pick depends on whether you need the tool to also send email (few free tiers do) or just capture leads.",
      },
      {
        q: "Do I have to leave Shopify to switch?",
        a: "No. Privy is Shopify-native, but every alternative here works on Shopify too — and several, including Smart Prompts, also run on WooCommerce, Webflow, or a custom site, which is the main reason non-Shopify stores switch.",
      },
      {
        q: "Will a new popup tool replace my email platform?",
        a: "Usually not. Privy and, partly, Justuno bundle email sending; most alternatives — Wisepops, Poptin, Smart Prompts — are the capture layer and assume you keep your ESP like Klaviyo or Mailchimp.",
      },
      {
        q: "How do I compare popup tools fairly?",
        a: "Ignore feature counts. Decide which of three things is driving your switch — price at scale, smarter targeting and measurement, or non-Shopify support — and compare only on that. The tool that wins your one reason is your answer.",
      },
      {
        q: "Is it worth switching just to save money?",
        a: "If your list grew and the bill grew with it, yes — Poptin and Smart Prompts are meaningfully cheaper at scale. If price isn't the issue, switching for its own sake rarely pays off; match the tool to your reason instead.",
      },
    ],
  },
  {
    slug: "email-popup-examples",
    title: "Email popup examples that actually earn the signup",
    metaTitle: "Email Popup Examples",
    category: "Marketing Playbook",
    date: "Jul 31, 2026",
    excerpt:
      "Real email popup patterns with notes on why each one works — the trigger, the offer, and the ask — plus the mistakes that make people close the tab.",
    image: "/images/adNetworkWallpaper.png",
    body: `Two things are true at once about email popups. They work — a well-timed one is still one of the cheapest ways to turn a stranger into a subscriber. And everyone says they hate them. Both are true, and the gap between them is entirely about *how* the popup is done. A good one feels like a fair trade. A bad one feels like a door slammed in your face the second you walk in.

So instead of a list of rules, here are the patterns that actually earn the signup, grouped by what triggers them — because the trigger is most of what separates the welcome from the annoyance. Steal the pattern, not the wording.

## Exit-intent: the last-chance offer

![Exit-intent email popup offering a discount as the visitor moves to leave](/images/popup-example-exit-intent.png)

The classic. Someone's cursor drifts toward the close button or the back arrow, and *then* a small popup appears: "Before you go — 10% off your first order for your email." It works because the timing is honest. You didn't interrupt their shopping; you waited until they were leaving anyway and made one clear offer at the one moment it costs them nothing.

**Why it works:** it respects the visit. The ask comes at the end, not the start, and it's a real trade — a discount for an email — not a vague "join our newsletter."

**When to copy it:** any store with a first-order incentive. It's the safest popup you can run.

## Scroll-depth: the earned ask

![Scroll-triggered popup offering related content once a reader is partway down the page](/images/popup-example-scroll.png)

Instead of firing on a timer, this one waits until someone has scrolled halfway down a post or product page — proof they're actually interested — then offers something related: "Enjoying this? Get the next one in your inbox." A content site offering the guide as a download is the same move.

**Why it works:** engagement came first. You're asking people who've already shown they care, so the yes-rate is higher and the annoyance is lower.

**When to copy it:** content-heavy pages, long product descriptions, guides.

## Time-on-page: the patient popup

![Time-on-page popup that waits until a visitor has been reading before making the ask](/images/popup-example-time.png)

A cousin of scroll-depth: wait until someone's been on the page long enough to be genuinely reading — not three seconds, more like thirty or forty — then make the ask. The mistake almost everyone makes is setting this to fire immediately; the fix is simply patience.

**Why it works:** time is a proxy for interest, as long as you set the bar high enough. Thirty seconds says "reading." Three seconds says "still deciding whether to leave."

**When to copy it:** landing pages and articles where people arrive and settle in.

## Return visitor: the "welcome back" ask

![Return-visitor popup welcoming someone back with a tailored offer](/images/popup-example-return-visitor.png)

Someone who's here for the second or third time and still hasn't subscribed is a different audience than a first-timer. A popup that acknowledges it — "Back again? Here's that discount to make it official" — converts better than showing everyone the same cold offer.

**Why it works:** it's targeted. Repeat visitors have already shown intent; meeting them with a warmer, slightly different ask respects that.

**When to copy it:** any site with meaningful repeat traffic and a way to detect returning visitors.

## What the good ones have in common

Look across those and the pattern underneath is the same every time:

- **One ask.** Email, or a single choice. Not email *and* a phone number *and* a birthday on first contact.
- **A real reason to say yes.** A discount, a guide, early access — something the visitor actually wants, not "sign up for updates."
- **Honest timing.** The ask comes after some signal of interest — leaving, scrolling, reading, returning — never the instant the page loads.
- **An obvious way out.** A clear close button and no guilt-trip "No thanks, I hate saving money" copy. The easy dismiss is what keeps the *next* visit from resenting you.

## The mistakes that make people close the tab

- **Firing immediately.** The single most common error. Give the page a chance to make its case first.
- **Firing on every page.** Once someone dismisses it, stop asking for the rest of the session. Nothing reads as "we don't listen" faster than the same popup on every click.
- **Ignoring mobile.** A popup that covers the whole screen with a close button too small to hit is a bounce machine on phones. Test it on an actual phone.
- **No easy dismiss.** Hidden or tiny close buttons don't trap the signup; they train people to leave.

## How to tell if yours is working

Here's the metric that matters, and it's not the one most tools show you first: **show-to-submit rate** — of the people who saw the popup, how many actually filled it in. Impressions alone tell you nothing; a popup shown 10,000 times and submitted 30 isn't "working," it's wallpaper. Watching the show-to-submit rate is the whole game, because it's the number that tells you whether the trade felt fair.

That's the reason our own [exit intent popup software](/for-businesses/smart-prompts) logs shown, submitted, and dismissed for every prompt — so you can see which of these patterns actually earns the signup on *your* site instead of guessing. And if you're still choosing a tool to build them in, here's an honest look at the [Privy alternatives](/for-people/education/privy-alternatives).`,
    faqs: [
      {
        q: "When should an email popup appear?",
        a: "After a signal of interest, never on load. Exit-intent, a scroll past halfway, thirty-plus seconds on the page, or a return visit all work. Firing immediately is the most common reason people close the tab.",
      },
      {
        q: "Do email popups still work?",
        a: "Yes, when the trade feels fair. A timely popup with one clear ask and a real incentive still converts well; the reason popups have a bad reputation is bad execution — instant firing, no easy dismiss — not the format itself.",
      },
      {
        q: "What's a good popup conversion rate?",
        a: "Rather than chase a benchmark, watch your show-to-submit rate over time and improve it. Impressions are vanity; the share of people who saw the popup and actually submitted is the number that tells you whether it's working.",
      },
      {
        q: "Are popups bad for mobile?",
        a: "Only when they're built badly. A full-screen popup with a tiny close button is a bounce machine on phones. A small, easily dismissed popup timed to interest works fine — but test it on a real device, not just desktop.",
      },
      {
        q: "How many popups should one page have?",
        a: "One at a time, and stop after a dismiss. Showing the same popup on every page of a session is the fastest way to make a visitor feel unheard. Fire once, respect the no, and move on.",
      },
    ],
  },
  {
    slug: "klaviyo-popups",
    title: "How to set up popups in Klaviyo",
    metaTitle: "How to Set Up Klaviyo Popups",
    category: "Marketing Playbook",
    date: "Jul 31, 2026",
    excerpt:
      "A plain-English walkthrough of building a signup popup in Klaviyo — the form, the trigger, the timing, and the targeting — plus how to tell if it's actually working.",
    image: "/images/LocalMailWallpaper.png",
    body: `If you already send email through Klaviyo, you don't need a separate tool to start collecting subscribers — Klaviyo can show a signup popup on your site and drop new emails straight into a list. It's not the most obvious part of the product, though, so here's the plain-English walkthrough: how to build one, where the settings that actually matter are hiding, and how to tell if it's working.

This is a genuine how-to, not a pitch. If Klaviyo is your email platform, its built-in signup forms are the natural place to start.

## Step 1: Create the form

In Klaviyo, signup popups live under **Signup Forms** (sometimes shown as "Forms"). Create a new form and you'll be asked to choose a type — **Popup** is the overlay that appears on top of the page, **Flyout** slides in from a corner, and **Embed** sits inline in your page. For a first email-capture popup, choose Popup.

Klaviyo will ask which **list** the form feeds. Point it at the list your welcome flow is built on, so new subscribers actually get the email you promised them. This is the step people skip, and it's why some popups collect addresses that then hear nothing.

## Step 2: Write the offer, not the "newsletter"

Inside the builder, keep the form to **one ask and one reason to say yes.** "Get 10% off your first order" beats "Sign up for our newsletter" every time, because the first is a trade and the second is a chore. If you're giving a code, make sure it's a code your store will actually honor.

Keep the fields minimal — email, maybe a first name. Every extra field lowers the number of people who finish.

## Step 3: Set the timing (this is the part that matters)

Under the form's **Behaviors** settings you'll find *when* it shows. The defaults are rarely what you want. The two settings worth your attention:

- **Trigger.** Klaviyo can show the form after a delay, after a scroll percentage, or on exit-intent. Exit-intent and scroll are almost always better than a short timer, because they wait for a signal of interest instead of interrupting.
- **Timing.** If you use a delay, set it to something like thirty seconds, not three. A popup that fires the instant the page loads is the number-one reason visitors close the tab.

## Step 4: Target the right people

Also under Behaviors is **targeting** — who sees the form. At minimum, tell Klaviyo not to show it to people who've *already* subscribed, so your existing customers aren't nagged. You can also limit it to certain pages, or to new versus returning visitors. A form that greets a returning visitor differently than a first-timer converts better.

## Step 5: Respect the dismiss

Find the setting that controls **how often the form reappears** after someone closes it, and set it so a dismiss is remembered. Showing the same popup on every page of a session is the fastest way to make someone resent you. Fire once, take the no, move on.

## Step 6: Publish and measure

Once it's live, Klaviyo shows the form's own analytics — **views, submissions, and the rate between them.** That last number, the share of people who saw the form and actually filled it in, is the one to watch. Impressions alone tell you nothing; a form shown thousands of times with a handful of submits isn't working, it's wallpaper. Change one thing at a time — the offer, the trigger, the timing — and watch that rate move.

## When you might want something alongside it

Klaviyo's forms are a solid place to start, and if they cover you, you're done. Where people reach for something more is usually one of two moments: they want triggers or per-prompt measurement beyond what the forms offer, or they want the same prompts running on a site Klaviyo's forms don't cover as cleanly.

That's the gap our own [exit intent popup software](/for-businesses/smart-prompts) fills — and to be clear, it works *alongside* Klaviyo, not instead of it. Klaviyo stays your email platform; the prompts are just the capture-and-measure layer in front of it. If your Klaviyo forms are doing the job, keep them. If you've hit their edges, that's the reason to look further.`,
    faqs: [
      {
        q: "Does Klaviyo have popups?",
        a: "Yes. Under Signup Forms you can build a popup, flyout, or embedded form that collects emails into a Klaviyo list, with control over the trigger, timing, and targeting.",
      },
      {
        q: "When should a Klaviyo popup appear?",
        a: "After a signal of interest — exit-intent or a scroll percentage — or on a delay of thirty seconds or so, not three. Firing the instant the page loads is the most common reason people dismiss it.",
      },
      {
        q: "How do I stop a Klaviyo popup from showing to existing subscribers?",
        a: "In the form's Behaviors and targeting settings, exclude people who are already on the list, and set the reappear frequency so a dismiss is remembered. That keeps returning customers from being nagged.",
      },
      {
        q: "Do I need a separate tool if I already use Klaviyo?",
        a: "Not to start — Klaviyo's built-in forms cover the basics well. People add a dedicated tool only when they want smarter triggers, per-prompt measurement, or the same prompts on sites Klaviyo's forms don't cover, and even then it runs alongside Klaviyo, not instead of it.",
      },
      {
        q: "How do I know if my Klaviyo popup is working?",
        a: "Watch the submission rate — the share of people who saw the form and filled it in — not the raw view count. A form with thousands of views and few submits isn't working; change the offer or timing and watch that rate move.",
      },
    ],
  },
  {
    slug: "link-management-tools",
    title: "Link management tools, honestly compared",
    metaTitle: "Link Management Tools Compared",
    category: "Marketing Playbook",
    date: "Jul 31, 2026",
    excerpt:
      "An honest comparison of the main link management tools — what each is best at, who it suits, and where it falls short — so you can pick by how you actually share links.",
    image: "/images/AskUsAnythingWallpaper.png",
    body: `Every link you share is a small handoff. Someone taps it in an email, a text, an ad, or a bio and lands somewhere — and in that half-second, a surprising amount can go right or wrong. Did it go to the correct page? Did the click get counted? Whose data was it, yours or the platform's? Was that even a person, or a bot scanning the link?

A link management tool is what sits in that gap. But "link management" covers everything from a free shortener with a click counter to first-party infrastructure that routes, filters, and measures. So here's an honest map of the main tools — what each is genuinely best at, who it suits, and where it falls short — so you can pick by how you actually share links instead of by whose feature table is longest.

## What "link management" actually means

Before the list, one distinction that decides most of this: **a URL shortener makes a link shorter and counts clicks on someone else's domain; link management runs on your own domain, so the click data is yours and you can route, filter, and change destinations on top.** Some tools below are closer to the first, some to the second. Neither is wrong — it depends on what you need. Keep your own reason in mind as you read: branding, routing, clean numbers, or owning the data.

## The tools, one at a time

**Rebrandly** — best at branded short domains at scale. If your priority is putting every link on your own branded domain with a big, organized workspace and team features, Rebrandly is the category veteran. Where it falls short: it's priced and built for volume, so for a small operation it can be more than you need, and deep analytics aren't its focus. (If you're searching "Rebrandly alternative," it's usually about price at your volume — worth naming.)

**Linkly** — strong on routing and click analytics at a friendly price. Good device and geo redirects, retargeting pixels, and clean reporting. Where it's weaker: it's a focused link tool, not a wider measurement platform, so it lives alongside your analytics rather than replacing them.

**ClickMagick** — best for people who want serious click and conversion tracking, popular with affiliates and paid-traffic buyers. It leans into attribution, bot filtering, and split-testing. Where it falls short: that power comes with complexity and a price to match, and its affiliate-heavy framing isn't for every brand. (The common "ClickMagick alternative" search is usually someone who wants the tracking without the affiliate-tool weight.)

**Switchy** — the best-looking, most modern of the bunch, with smart-page and CTA features. Suits creators and social-first brands. Where it's weaker: it's oriented around bio-link and social use more than campaign-grade routing.

**Bitly** — the name everyone knows, best for simple, reliable shortening at scale with a familiar dashboard. Where it falls short: the free and lower tiers are shortening-first, the click data lives on Bitly's side, and the features you'd want for real routing sit in the pricier plans.

**Short.io** — a solid middle ground: branded domains, decent routing, fair pricing. Where it's weaker: it does a lot competently without being the standout at any one thing — fine if "competent all-rounder" is what you want.

**Dub** — the modern, developer-friendly, open-source-rooted option, clean and fast with a generous free tier. Suits technical teams. Where it falls short: it's newer and leaner on the campaign-marketing features the others have built up over years.

**Smart Links (ours)** — since it's our blog, here it is in the same format, no bigger section. Smart Links is [link management software](/for-businesses/smart-links) that runs first-party on your own domain, routes each click by device, location, cart status, or audience, respects consent, and filters out bots and email security scanners so your numbers are real people. It feeds every click into Chapter attribution if you use it. Where it falls short: it's newer than Rebrandly or Bitly, so there's less of a template gallery and brand recognition — and if all you want is the shortest possible free vanity link, a plain shortener is simpler.

## How they compare, honestly

No all-checkmarks column — here's who actually wins what:

- **Branded domains at scale:** Rebrandly.
- **Name recognition and dead-simple shortening:** Bitly.
- **Deepest click and conversion tracking:** ClickMagick.
- **Best value routing plus analytics:** Linkly, Short.io.
- **Prettiest, creator-friendly:** Switchy.
- **Developer-friendly and modern:** Dub.
- **First-party by design, consent plus bot filtering, attribution built in:** Smart Links.

Every tool loses a row. A page where one option won everything wouldn't be worth reading.

## How to choose, by situation

Pick the sentence that sounds like you:

- **"I just want short, branded links and a team workspace."** Rebrandly, or Short.io for less.
- **"I run paid traffic and need real conversion tracking."** ClickMagick.
- **"I want good routing and reporting without a big bill."** Linkly or Short.io.
- **"I'm a creator living in link-in-bio."** Switchy.
- **"My team is technical and wants something clean and modern."** Dub.
- **"I care that the click data is mine, that bots aren't in my numbers, and that it feeds my attribution."** That's the gap we built Smart Links for — but any of these beats a raw link with no measurement.

The honest truth is that most of these tools will shorten a link and count a click perfectly well. The real question is who owns the data afterward and whether what you're counting is real — which is worth its own read: [why your click data disappears](/for-people/education/first-party-click-tracking). If owning it on your own domain is the priority, you can [start a free trial](/chapter/signup) and wrap your first link this week.`,
    faqs: [
      {
        q: "What's the difference between a URL shortener and link management?",
        a: "A shortener makes a link shorter and counts clicks on someone else's domain. Link management runs on your own domain, so the click data is yours, and it adds routing, consent handling, and bot filtering on top.",
      },
      {
        q: "What's the best Rebrandly alternative?",
        a: "It depends on your reason for leaving. If it's price at your volume, look at Short.io or Smart Links; if it's deeper tracking, ClickMagick; if it's owning the data first-party with bot filtering, Smart Links. Match the alternative to the one thing driving the switch.",
      },
      {
        q: "What's a good ClickMagick alternative?",
        a: "If you want ClickMagick's tracking without the affiliate-tool weight, look at Linkly for value routing and analytics, or Smart Links for first-party click data with consent and bot filtering built in.",
      },
      {
        q: "Do link management tools work with my email and ad platforms?",
        a: "Yes — the good ones wrap links behind Mailchimp, Klaviyo, Meta, Google Ads, Shopify Email, and the rest. The link is just a redirect in front of your destination, so it sits behind whatever you already send from.",
      },
      {
        q: "Are free link tools good enough?",
        a: "For plain shortening, often yes. The moment you care about owning the click data, routing different people to different pages, or keeping bots out of your numbers, the free-shortener tier stops being enough — that's the line between a shortener and link management.",
      },
    ],
  },
  {
    slug: "first-party-click-tracking",
    title: "Why your click data disappears",
    metaTitle: "First-Party Click Tracking",
    category: "Marketing Playbook",
    date: "Jul 31, 2026",
    excerpt:
      "Third-party click data quietly decays in modern browsers. What changed with cookies and ITP, what first-party tracking actually means, and how to tell if you're losing data.",
    image: "/images/PrivacyProtectionWallpaper.png",
    body: `Here's a frustration a lot of businesses feel but can't quite name: you know a campaign worked — sales went up the week you sent it — but when you open the tracking, half the clicks and conversions you expected just aren't there. The numbers feel thin. You didn't do anything wrong. The data quietly disappeared on its way to you, and the reason is buried in how browsers have changed.

Let's pull it apart in plain English, because once you see where the data goes, the fix is obvious.

## First-party vs third-party, without the jargon

Every click and cookie is either **first-party** — owned by the domain the person is actually visiting — or **third-party**, owned by some other domain riding along in the background. When you visit a store, the store's own cookie is first-party. The ad network's tracking pixel loading in the corner is third-party.

For years, most click tracking leaned on third-party cookies and cross-site identifiers. It worked because browsers let that data persist for a long time. That's the part that changed.

## What ITP and the cookie crackdown actually did

Starting with Apple's **Intelligent Tracking Prevention** in Safari, and followed by Firefox, Brave, and eventually Chrome, browsers began aggressively limiting third-party and cross-site tracking. In practice that means third-party cookies get blocked outright in several browsers, and even many cookies set in a "sort of first-party but really cross-site" way get their lifespan capped — often to **seven days, sometimes 24 hours.**

None of this was aimed at you. It was aimed at the ad-tech track-everyone-everywhere model. But your click tracking got caught in the same net, because it was built on the same plumbing.

## Why third-party click data decays

Put those together and here's the leak. A visitor clicks your link. If the tracking is riding on a third-party or cross-site cookie, one of two things happens: the browser blocks it on the spot, or it sets it with a short expiry. Come back to that visitor a week later — the return visit, the eventual purchase — and the thread connecting it to the original click is already gone. The click happened. The conversion happened. But the browser cut the string between them.

Multiply that across every visitor on Safari and every privacy-forward browser, and you don't lose a little at the edges — you lose a systematic, invisible slice of your best data. And it decays more every year as more browsers tighten the rules.

There's a second leak on top of it: **bots and email security scanners.** Every link in an email gets clicked by automated scanners before a human ever sees it, and datacenter bots crawl links constantly. If your tracking counts those as clicks, your numbers are inflated in one direction while the cookie decay deflates them in another. You end up with data that's both too high and too low at once.

## What "first-party" actually means in practice

The fix isn't a clever workaround to sneak past the browsers — it's to stop fighting them. If the link and the click run on **your own domain**, the cookie is genuinely first-party, and browsers treat it the way they treat a store's own login: it's allowed, and it lasts.

Concretely, that means wrapping the links you share so they pass through your domain first, then redirect. The click is recorded on your side, on a first-party cookie that survives, before the visitor ever lands on the destination. Same visitor, same journey — but now the string between the click and the conversion doesn't get cut, because nothing about it looks like cross-site tracking. It isn't.

Do that and you can also filter the bots and scanners out at the same doorway, so what's left is first-party *and* real.

## How to tell if you're losing data

You don't need a lab to spot this. A few signs your click data is quietly decaying:

- **Your platform's clicks are far higher than your on-site sessions from that campaign.** Scanners and bots inflate the click side.
- **Conversions "from" a channel drop off a cliff after a few days** even though sales continue — the cookie expired and later purchases lost their attribution.
- **Safari and iOS users look strangely unprofitable** next to Android and Chrome. They're not; their data is just being cut sooner.
- **Two tools disagree wildly** on the same campaign — one saw the click, the other lost the thread. (That specific disagreement has its own deeper story: [why your marketing reports never agree](/for-people/education/why-your-marketing-reports-never-agree).)

If a few of those sound familiar, you're not measuring badly — you're measuring on plumbing the browsers have quietly turned off.

That's the whole reason we built our [link management software](/for-businesses/smart-links) to run first-party by default: so the click is yours, it lasts, and the bots are filtered before they ever reach your numbers. The browsers aren't going to loosen up. The move is to stop depending on the thing they're switching off.`,
    faqs: [
      {
        q: "What is first-party click tracking?",
        a: "Tracking where the click and cookie run on your own domain rather than a third party's. Because the browser sees it as first-party, it isn't blocked or given a short expiry, so the data survives and stays yours.",
      },
      {
        q: "Why is my click data lower than it should be?",
        a: "Modern browsers block third-party cookies and cap cross-site ones to as little as seven days. If your tracking rides on those, later return visits and conversions lose their connection to the original click, so a systematic slice of your data quietly disappears.",
      },
      {
        q: "What is ITP?",
        a: "Intelligent Tracking Prevention, Apple's Safari feature that limits cross-site tracking. Firefox, Brave, and Chrome have followed with similar restrictions. It targets ad-tech tracking but catches conventional click tracking built on the same third-party plumbing.",
      },
      {
        q: "Do third-party cookies still work?",
        a: "Decreasingly. Several browsers block them outright, and cross-site cookies that do get set are often capped to a week or less. Building click tracking on them means losing more data every year as the rules tighten.",
      },
      {
        q: "How do I fix disappearing click data?",
        a: "Move the click to your own domain so the cookie is genuinely first-party and survives, and filter out bots and email scanners at the same point. That's what first-party link management does — it stops depending on the cross-site tracking browsers are switching off.",
      },
    ],
  },
  {
    slug: "outsourced-marketing-small-business",
    title: "When outsourcing your marketing actually makes sense",
    metaTitle: "Outsourced Marketing for Small Business: When It's Worth It",
    category: "Marketing Playbook",
    date: "Aug 1, 2026",
    publishAt: "2026-08-01",
    excerpt:
      "Should you outsource your marketing? An honest look at what it costs, what you give up, and the point where doing it yourself stops making sense.",
    image: "/images/ConsultingWallpaper.png",
    body: `Most owners don't start by asking what outsourced marketing is. They start on a Sunday night, looking at a list of things that didn't get done again, wondering whether paying someone would fix it.

Sometimes it would. Sometimes it's the most expensive way to avoid a decision you haven't made yet. This is an honest look at which situation you're in — including the cases where the answer is no, keep doing it yourself.

## The three reasons owners start looking

Almost everyone arrives here for one of three reasons, and they lead to different answers.

**Out of time.** The marketing is working well enough, you just can't keep feeding it. This is the best reason to outsource. You already know what works; you need hands.

**Out of depth.** You can run an email list but paid ads lose money every time you try. Also a good reason — you're buying a skill you don't have and don't want to spend a year acquiring.

**Out of patience.** You've tried things, nothing stuck, and you're hoping someone else knows the secret. This is the risky one. If you can't say what success looks like, outsourcing usually means paying someone to be uncertain on your behalf.

![A small business owner reviewing marketing tasks that keep getting postponed](/images/OwnaBusiness.png#half "The list that doesn't shrink is usually what starts the conversation")

## What outsourcing actually costs

Most articles on this dodge the number. Here's the shape of it.

**Project work** — a website refresh, a campaign build, a one-time setup — generally runs in the hundreds to low thousands depending on scope. You pay once and you own the result.

**Ongoing retainers** with a small agency or freelancer commonly land in the four-figures-per-month range. Larger agencies start higher, sometimes considerably.

**A full-time hire** costs more than most small businesses spend on marketing in total, once you include salary, taxes, benefits, and the tools they'll ask for. And one person rarely covers ads, email, SEO, and the website well.

**The more useful question than "what does it cost" is "what does it need to return."** If you're spending $1,500 a month, the marketing has to produce meaningfully more than $1,500 in profit — not revenue — to be worth it. Work that backwards before you shop. It tells you what you can afford and what you should expect, and it makes every sales conversation shorter.

## What you give up

Real costs that don't appear on the invoice.

**Immediacy.** You can no longer change the homepage at 9pm because you thought of something. There's a queue now, and you're in it.

**Ramp-up.** Nobody is useful in week one. Expect a month or two before an outside team knows your customers well enough to be better than you at talking to them.

**Voice.** This is the one owners underestimate. Your marketing sounds like you because you wrote it. Someone else writing it will sound close, then a little off, then fine again once they've learned — but there's a stretch in the middle that costs you something.

**Dependency.** If they leave, some of what they knew leaves too. Ask up front what you keep.

## When to keep it in-house

**Keep it when you enjoy it.** Owners who like marketing are usually good at it, because they do it consistently and they know the customer better than anyone you could hire.

**Keep it when the business is still moving.** If the offer, price, or audience is still changing month to month, an outside team spends your money learning a target that keeps moving. Settle the fundamentals first.

**Keep it when the budget is below the floor.** Under a few hundred a month you won't buy enough of anyone's attention to matter. You'll buy a report. Spend it on one tool and your own time instead until there's more.

## The middle option most people miss

The choice isn't all-or-nothing, and framing it that way is why a lot of owners stall.

You can outsource one channel and keep the rest. You can hand off the work you hate and keep the work you're good at. You can bring someone in for a defined project, see how it goes, and decide from evidence rather than from a pitch.

That's the shape of our [outsourced marketing plans](/for-businesses) — active projects you choose, rather than a retainer that quietly covers everything and explains nothing. It's also just a sensible way to start with anyone, including people who aren't us.

## Questions to ask before you sign anything

**"What exactly am I getting each month?"** Vague scope is where retainers go to die. Get it in writing as deliverables, not hours.

**"What do I keep if we stop?"** Accounts, ad account access, email lists, website admin, the tracking setup. All of it should be in your name from day one.

**"How will we know it's working?"** If the only evidence of progress is a report they write, that's not measurement. You should be able to see the numbers yourself.

**"Who's actually doing the work?"** The person selling is often not the person delivering. Ask to meet them.

**"What happens in month one?"** A good answer is specific and unglamorous — audit, access, setup, a first small thing shipped. A bad answer is a strategy phase with no output.`,
    faqs: [
      {
        q: "How much does outsourced marketing cost for a small business?",
        a: "It ranges widely. Project work often lands in the hundreds; ongoing retainers with a small agency commonly run four figures a month. The more useful question is what the work needs to return to be worth it — if you're spending $1,500 a month, the marketing needs to produce meaningfully more than that in profit.",
      },
      {
        q: "Is outsourcing marketing better than hiring someone?",
        a: "It depends on how much work there is. One full-time marketer costs more than most small businesses spend on marketing in total, and a single hire rarely covers ads, email, SEO, and the website. Outsourcing buys a range of skills for less than one salary. A hire wins when the volume of work is steady enough to fill a whole role.",
      },
      {
        q: "What should I outsource first?",
        a: "Whatever is both time-consuming and skill-dependent. For most small businesses that's paid ads or email — work that needs doing consistently and punishes guesswork. Keep the parts that depend on knowing your customers personally.",
      },
      {
        q: "How do I know if it's working?",
        a: "Agree on what you're measuring before the work starts, and make sure you can see it yourself. If the only evidence of progress is a monthly report written by the person you're paying, that's not measurement.",
      },
      {
        q: "Can I outsource just part of my marketing?",
        a: "Yes, and for most small businesses that's the better starting point. Pick one channel, run it for a quarter, and judge from the result rather than committing to everything at once.",
      },
    ],
  },
  {
    slug: "fractional-marketing-team",
    title: "A fractional marketing team is not a fractional CMO",
    metaTitle: "Fractional Marketing Team: What It Is and Who It Suits",
    category: "Marketing Playbook",
    date: "Aug 1, 2026",
    publishAt: "2026-08-01",
    excerpt:
      "A fractional marketing team is not a fractional CMO, and the difference decides whether it works for you. What each one does, what they cost, and who needs which.",
    image: "/images/MarketingGuidebookWallpaper.png",
    body: `Both terms get used as if they mean the same thing. They don't, and the difference is the whole decision.

One is a senior person who tells you what to do. The other is a group of people who do it. If you buy the wrong one, you end up with an expensive plan and nobody to execute it, or a lot of activity pointed in no particular direction. Here's how to tell which you need.

## Fractional CMO vs fractional team vs agency

| | Fractional CMO | Fractional marketing team | Agency |
|---|---|---|---|
| **What you get** | One senior strategist, part time | A group covering ads, email, SEO, web | A vendor running defined campaigns |
| **What they do** | Decide direction, set priorities | Execute across channels | Execute their specialty |
| **Typical cost** | Highest per hour, lowest output volume | Mid — a share of several people | Varies widely by scope |
| **Suits** | Businesses with staff to direct | Businesses with work and no team | Businesses with one clear need |
| **Fails when** | There's nobody to execute the plan | You need one accountable owner | Your need spans channels |

**The short version:** a fractional CMO is leadership. A fractional team is capacity. Most small businesses already know roughly what needs doing. They need hands, not another strategy deck.

![Comparison of a fractional CMO, a fractional marketing team, and an agency](/images/Consulting.png#half "Leadership, capacity, and campaigns are three different purchases")

## What a fractional team actually covers

The word "fractional" describes how you buy it, not what it is. You're getting a share of several specialists rather than all of one generalist.

In practice that usually means:

**The channels that need consistent work** — email sends, ad management, posting and profile upkeep. Things that decay if nobody touches them for a month.

**The projects that need a skill you don't have** — a website rebuild, tracking setup, a migration between tools.

**The measurement layer** — someone making sure you can actually tell what worked, which is the part most small businesses skip and later regret.

**What it usually doesn't cover:** being available within the hour, sitting in your meetings all week, or knowing your customers as well as you do. That last one stays yours no matter who you hire.

## What it costs, honestly

A fractional team generally costs less than one full-time marketing hire — often substantially — because you're buying a portion of several people instead of all of one.

A fractional CMO usually costs **more per hour and buys less execution.** That's not a criticism; senior strategic time is expensive everywhere. It's just worth knowing that the higher rate buys thinking, not doing. If you're paying CMO rates and still doing the work yourself, something has gone wrong.

Cost typically scales with how much work you want running at once rather than with hours logged. That's a better fit for small businesses, because it means a quiet month costs less than a busy one.

## Who this works for

**Works when there's more work than you can do, but not enough for a salary.** That gap is exactly what the model exists to fill.

**Works when the work spans channels.** One hire is rarely good at ads and email and SEO and the website. A team is, because it's several people.

**Works when you want to start small.** You can run one project, see the result, and expand or stop. Hiring doesn't give you that.

## Who it doesn't work for

Being straight about this saves everyone time.

**Not for businesses needing someone available all day.** If your marketing requires immediate response — live events, breaking news, constant reactive posting — you need someone in the building.

**Not for businesses that want one accountable person.** A team spreads responsibility by design. Some owners find that freeing and some find it maddening. Know which you are.

**Not for pre-product-market-fit businesses.** If the offer and audience are still changing monthly, you'll pay a team to learn a moving target. Settle that first.

**Not a replacement for knowing your own customers.** Nobody you hire will know them like you do. The good ones will keep asking you.

## How it works in practice

The version we run is built around active projects rather than a blanket retainer — you pick what's running, it changes when your priorities change, and you can see what each project is doing. That's our [on-demand marketing team plans](/for-businesses).

If you'd rather talk it through before committing to anything, that's what a [small business marketing consultant](/for-businesses/consulting) conversation is for. Either way, ask any provider the same question first: what exactly is running this month, and how will I know if it worked?`,
    faqs: [
      {
        q: "What is a fractional marketing team?",
        a: "A group of marketers who work across several businesses rather than one, giving you a range of skills — ads, email, SEO, web — for part of the cost of hiring any one of them full time. You get a team's coverage at a fraction of a team's payroll.",
      },
      {
        q: "How is a fractional marketing team different from a fractional CMO?",
        a: "A fractional CMO is one senior person who sets direction. A fractional team does the work. The CMO tells you what to do; the team does it. Most small businesses already know roughly what needs doing and need hands, not another strategy deck.",
      },
      {
        q: "How much does a fractional marketing team cost?",
        a: "Less than one full-time marketing hire, generally by a wide margin, because you're buying a share of several people rather than all of one. Cost usually scales with how much active work you want running at once rather than with hours logged.",
      },
      {
        q: "Is a fractional team the same as hiring an agency?",
        a: "There's overlap, and the labels get used loosely. The practical difference is posture: agencies typically sell campaigns, fractional teams typically embed and handle whatever the marketing function needs that month. Ask which one you're buying before you sign.",
      },
      {
        q: "When should a small business consider one?",
        a: "When there's consistently more marketing work than you can do yourself, but not enough to justify a full-time salary. That gap is exactly what the model exists to fill.",
      },
    ],
  },
  {
    slug: "marketing-automation-small-business",
    title: "What's actually worth automating when you're small",
    metaTitle: "Marketing Automation for Small Business: What's Worth Automating",
    category: "Marketing Playbook",
    date: "Aug 3, 2026",
    publishAt: "2026-08-03",
    excerpt:
      "Most small businesses automate the wrong things first. Which tasks are worth automating, which tools fit a small budget, and where AI genuinely helps.",
    image: "/images/DigitalAuditWallpaper.png",
    body: `Most marketing automation advice is written for companies with a marketing department. It assumes someone owns the tool, someone else writes the content, and a third person checks whether any of it worked.

You have none of that. You have a business to run and maybe an hour on a Tuesday. So the question isn't which platform has the best workflow builder. It's which handful of things, automated once, will keep earning while you're doing something else.

## Start with the task, not the tool

The mistake almost everyone makes is buying a platform and then looking for things to put in it. That's backwards, and it's why so many small businesses pay for automation software they use for one welcome email.

Start from the other end. Look for tasks that are **repetitive, rule-based, and currently not happening.** All three matter. Repetitive means it's worth setting up. Rule-based means a computer can do it without judgment. Not happening means automating it adds something rather than just moving it.

Anything failing one of those three is a bad first candidate.

![Sorting marketing tasks by whether they are repetitive and rule-based](/images/DigitalAudit.png "Repetitive, rule-based, and not currently happening — all three, or skip it")

## The five things worth automating first

In rough order of return.

**Welcome emails.** Someone joins your list at their most interested moment. Without automation they hear from you whenever you next get around to sending something. One email, sent immediately, is the highest-return automation most small businesses will ever build.

**Abandoned cart or abandoned enquiry.** If you sell online, this recovers revenue you're currently losing by default. If you don't sell online, the equivalent is the follow-up to someone who asked a question and never heard back.

**Review requests.** Timed to fire after a purchase or a completed job. Reviews compound — they feed local search, they feed conversion, and asking manually means asking inconsistently.

**Lead routing and follow-up.** A form submission that lands in an inbox and waits until evening is a lead cooling off. Automating the acknowledgment buys you hours.

**Reporting.** Not glamorous, but automating the assembly of your numbers means you actually look at them. Most owners stop measuring because collecting the data is tedious.

## What not to automate

The advantage a small business has over a large one is being a person. Automating that away is a bad trade.

**Responses to unhappy customers.** An automated reply to a complaint reads as "we didn't read this." Handle those yourself, every time.

**Messages to your best regulars.** The people who spend the most with you usually know you. A templated message to someone who considers you a person is worse than no message.

**Anything requiring judgment about a specific situation.** If the right response depends on knowing the context, a rule can't make it.

**Content that's supposed to sound like you.** You can draft faster with help. You shouldn't hand over the voice entirely, because the voice is often the reason people chose you.

## The tools, honestly

Three tiers, and most small businesses need only the first.

**Your existing email platform.** Mailchimp, Klaviyo, Constant Contact, Shopify's built-in messaging, and most others include automation for welcome sequences, cart recovery, and basic triggers. You're likely paying for this already. **For most small businesses, everything in the list above can be built here, and this is where you should start.**

**A connector tool.** Zapier, Make, and similar exist to make tools talk to each other — form to CRM, purchase to review request, enquiry to Slack. Worth it once you've hit a wall your email platform can't cross. Not worth it before.

**A CRM with automation built in.** HubSpot, Zoho, and others bundle contact management with workflows. Real capability, real cost, and real setup time. This tier makes sense when you're managing enough contacts that keeping track has become its own job.

**The honest advice:** most small businesses should exhaust tier one before buying anything from tier two or three. The tools aren't the constraint. Setting them up and leaving them running is.

## Where AI actually helps — and where it doesn't

AI shows up in every automation pitch right now, so it's worth being specific about where it earns its place.

**It helps you plan and draft faster.** Getting from blank page to a workable first version of a welcome sequence, a set of subject lines, or a follow-up message is genuinely faster with help. That's real time saved on the part most owners stall on.

**It helps you connect things you couldn't before.** Describing what you want in plain language and getting a working setup out the other end has lowered the technical floor considerably. Things that used to need a developer often don't.

**It does not replace knowing your customers.** This is where most AI marketing claims oversell. A model can write a competent email to a generic audience. It can't know that your regulars hate discount language, or that your busiest month is different from everyone else's in your industry. That knowledge is yours, and it's what makes the automation land.

**Treat AI as an accelerant on the work, not a substitute for the system.** The automation still needs somewhere to run and something to trigger it. Faster drafting doesn't change which five things are worth automating.

## How to tell if it's working

Two numbers, and neither is the one most tools show first.

**Time saved.** Roughly how many hours a month are you not spending on this anymore? If the answer is "none, but I built a lot of workflows," you've automated the wrong things.

**Revenue influenced.** Did the welcome email produce orders? Did cart recovery recover carts? These are answerable, and they're the only reason any of this matters.

Emails sent, workflows built, and tools connected are activity. If your setup is getting complicated enough that you can't answer those two questions, that's usually the point to bring in [marketing operations support](/for-businesses/marketing-ops) — or to simplify until you can answer them again.`,
    faqs: [
      {
        q: "What should a small business automate first?",
        a: "Welcome emails and abandoned-cart follow-ups, in that order. Both are rule-based, both run without supervision once set up, and both recover revenue you're currently losing by default.",
      },
      {
        q: "Do I need expensive software to automate marketing?",
        a: "No. Most small businesses can cover their first several automations inside the email platform they already pay for. The cost usually shows up later, when you want different tools talking to each other.",
      },
      {
        q: "Does AI replace marketing automation tools?",
        a: "No. AI helps you plan faster, draft faster, and connect things more easily. The automation still needs somewhere to run and something to trigger it. Treat AI as an accelerant on the work, not a substitute for the system.",
      },
      {
        q: "What shouldn't be automated?",
        a: "Anything where being a person is the point. Responses to unhappy customers, messages to your best regulars, and anything requiring judgment about a specific situation. Automating those is how small businesses lose the advantage they have over big ones.",
      },
      {
        q: "How do I know if my automation is actually working?",
        a: "Measure time saved and revenue influenced. Emails sent, workflows built, and tools connected are activity, not results.",
      },
    ],
  },
  {
    slug: "how-to-audit-your-online-presence",
    title: "How to audit your online presence in an afternoon",
    metaTitle: "How to Audit Your Online Presence (Step by Step)",
    category: "Marketing Playbook",
    date: "Aug 5, 2026",
    publishAt: "2026-08-05",
    excerpt:
      "An online presence audit is just looking at your business the way a customer does. Here's how to find everything, what to check, and what to fix first.",
    image: "/images/DigitalAuditWallpaper.png",
    body: `Your business exists in more places than you put it. Directory listings you never made. A Yelp page someone else created. An old Facebook page with the wrong hours. A Google Business Profile with a photo from four years ago.

An online presence audit is just going and looking at all of it, in order, the way a customer would. It takes an afternoon and it usually turns up something embarrassing. Here's how to do it properly.

## What an online presence audit actually covers

Three things, and most people only check the first.

**Your website** — not whether it loads, but whether someone who's never heard of you can tell what you do and how to contact you within a few seconds.

**Your profiles and listings** — Google Business Profile, Yelp, Facebook, Instagram, and whichever industry directories matter in your category. These are what people check *before* they visit your site, which makes them higher-stakes than most owners assume.

**The gaps** — places you should be and aren't. This is the part nobody thinks to audit, because you can't see what isn't there.

![The three areas of an online presence audit: website, profiles, and gaps](/images/DigitalAudit.png "Most audits stop at the website. The profiles usually matter more.")

## Step one: find everything

Before you can review it, you need the list — and it will be longer than you expect.

**Search your business name.** Not on your own computer, where Google knows you. Open a private window and search your name, then your name plus your city, then your name plus your main service. Write down everything on the first two pages.

**Search your phone number and your address.** This surfaces listings that don't use your exact business name — the ones created by aggregators, or by an employee in 2019, or by a customer.

**Check the obvious platforms directly.** Google Business Profile, Yelp, Facebook, Instagram, Apple Maps, Bing Places, and whatever is standard in your industry.

**Write it all in one place.** A spreadsheet is fine. One row per property, with the URL and who controls it. Half the value of an audit is just having the list.

## Step two: the consumer pass

Now go through the list once as a customer would — quickly, impatiently, without any inside knowledge.

For each property, three questions:

**Can I tell what this business does?** In about three seconds, without scrolling.

**Can I tell whether it's still open and real?** Recent photos, recent reviews, current hours. A listing that looks abandoned reads as *closed*, even when it isn't.

**Can I contact them the way I want to?** Some people call. Some fill in forms. Some message on Instagram and expect an answer. Every one of those paths should work.

Be honest here. It's harder than it sounds to look at your own business as a stranger, and the whole exercise fails if you grade generously.

## Step three: the marketer pass

Second time through, looking for what's broken rather than what's confusing.

**Consistency.** Name, address, and phone number identical everywhere. Not "Street" in one place and "St." in another. Search engines treat inconsistency as uncertainty.

**Completeness.** Most profiles are half-filled. Categories, service lists, attributes, hours including holidays, photos. The fields exist because they get used.

**Broken things.** Dead links, 404 pages, forms that don't submit, a phone number that goes nowhere. Test the contact form. Actually submit it.

**Reviews.** Not just the rating — whether anyone replied. Unanswered reviews, good or bad, read as nobody's home.

**Ownership.** Can you actually log in and edit each of these? Unclaimed listings are the most common finding in any audit, and they're usually the easiest fix.

## What to fix first

You'll finish with a long list and limited time. Order it like this:

**Anything factually wrong.** Wrong hours, wrong phone number, wrong address. These actively cost you customers today.

**Anything unclaimed.** Claim it before you improve it. You can't fix what you don't control.

**Broken contact paths.** A form that doesn't send is worse than no form.

**Incomplete profiles on platforms that matter.** Usually Google first, then whichever platform your customers actually use — which may not be the one you assume.

**Everything else.** Photos, descriptions, secondary directories. Real value, but none of it matters while your phone number is wrong somewhere.

## What most audits miss

**The gaps.** You'll naturally review what exists. Ask separately: where should we be that we aren't? A missing profile on the platform your customers use is invisible in any review of what you already have.

**Mobile.** Check every property on an actual phone. Not a narrow browser window — a phone. Things break there that look fine on a desktop.

**The path between properties.** Someone finds your Yelp listing, clicks through to your site, and lands on a homepage that doesn't mention the thing they were looking at. Each property being fine doesn't mean the journey is.

**Old accounts.** A Twitter account last posted to in 2021 isn't neutral. It suggests a business that started things and stopped.

## When it's worth having someone else do it

Doing this yourself is entirely reasonable, and if you've got an afternoon, do it. Two situations make it worth handing over.

**You can't see it fresh.** You built it, so you know where everything is and what it means. That's exactly the knowledge that makes it hard to spot what a stranger would find confusing.

**You want the fixes done, not just found.** A list of twenty problems is only progress if someone works through it.

That's what our [digital presence audit](/for-businesses/digital-health-check) is — a person, not an automated scanner, going through everything the way a customer would, then handing you a prioritized document. We can make the changes too, or you can. Either way you keep the document.`,
    faqs: [
      {
        q: "What is an online presence audit?",
        a: "A structured review of every place your business appears online — your website, your Google Business Profile, review sites, social profiles, and directory listings — checking each one for accuracy, completeness, and whether it actually helps a customer decide to contact you.",
      },
      {
        q: "How do I do a digital presence audit?",
        a: "Find everything first by searching your business name, phone number, and address in a private browser window. Then go through the list twice: once as a customer checking whether it's clear and trustworthy, once as a marketer checking for broken, missing, or inconsistent details. Fix anything factually wrong first.",
      },
      {
        q: "How often should I audit my online presence?",
        a: "Once or twice a year for most small businesses, and any time something material changes — new address, new hours, new service, a rebrand. Listings drift on their own, because aggregators update them without asking you.",
      },
      {
        q: "What's the most common problem an audit finds?",
        a: "Unclaimed listings and inconsistent contact details. Most businesses have at least one profile they didn't create and can't currently edit, and small variations in how the address is written across platforms.",
      },
      {
        q: "Do I need a tool to audit my online presence?",
        a: "No. Tools speed up finding listings, but the parts that matter — whether a stranger understands what you do, whether the contact paths work, whether the photos look current — need a person to judge. Most of this is done in a browser.",
      },
    ],
  },
  {
    slug: "what-is-eddm",
    title: "What is EDDM? Every Door Direct Mail, explained",
    metaTitle: "What Is EDDM? Every Door Direct Mail, Explained",
    category: "Marketing Playbook",
    date: "Aug 5, 2026",
    publishAt: "2026-08-05",
    excerpt:
      "EDDM lets you mail every home on a postal route without buying an address list. What it is, what it costs, the rules that trip people up, and when it's worth it.",
    image: "/images/LocalMailWallpaper.png",
    body: `EDDM stands for Every Door Direct Mail. It's a USPS program that lets you send mail to every address on a postal carrier route without buying a mailing list or knowing a single name.

That's the whole idea, and it's why it's cheaper than regular direct mail. You're not paying to target individuals. You're paying to blanket a neighborhood, and the carrier who already walks that route every day delivers your piece along with everything else.

## How it actually works

You pick routes, not people.

USPS breaks every ZIP code into carrier routes — the loop one mail carrier walks or drives in a day, usually a few hundred addresses. Through the EDDM tool you choose which routes to hit, see roughly how many households and businesses are on each, and filter by things like average household income, average age, and household size.

Then you print your piece, bundle it the way USPS asks, drop it at the post office serving those routes, and pay. Every address on the routes you selected gets one.

**No mailing list.** That's the part that surprises people. You never buy or build a list, which removes both a cost and a data-privacy headache.

![Selecting USPS carrier routes on a map for an EDDM campaign](/images/LocalMail.png#half "You choose routes, not addresses — that's what makes it cheap")

## The two versions, and which one you want

This trips up almost everyone the first time.

**EDDM Retail** is the small-business version. No mailing permit required, you pay at the post office, and there's a daily cap on how many pieces you can send per ZIP code. For most local businesses this is the right one and the cap is never a problem.

**EDDM BMEU** is the higher-volume version, handled through a Business Mail Entry Unit. It requires a permit and more paperwork, but it lifts the daily limit and opens up more options. If you're mailing at a scale where the retail cap matters, you've probably already got someone handling this for you.

**Which to pick:** if you're a local business mailing a neighborhood or two, Retail. If you're mailing tens of thousands of pieces, BMEU — and at that point work with a mail house.

## What EDDM costs

Three costs, and people usually only budget for one.

**Postage.** EDDM postage is priced per piece and is meaningfully cheaper than first-class mail, which is the entire appeal. Rates change, so check the current figure on the USPS EDDM page rather than trusting a number in a blog post — this one included.

**Printing.** Usually the bigger line item. Depends on size, paper weight, and quantity, and the per-piece cost drops sharply as volume rises.

**Design.** Either your time or someone else's. This is the cost most people skip and most regret, because the design does more to determine the result than the route selection does.

**A rough way to think about it:** postage plus printing together typically lands in the range of a few tens of cents per household. Mailing a thousand homes is a few hundred dollars, not a few thousand. That's the number to hold in your head before you go looking at exact rates.

## The requirements that trip people up

EDDM has physical rules, and pieces get rejected at the counter for breaking them.

**Size.** Your piece has to be bigger than a standard postcard — EDDM requires flat-size mail, so the small postcards you might picture don't qualify. Print shops sell EDDM-specific sizes precisely because of this. If you're ordering from one, say it's for EDDM and the size problem solves itself.

**Weight.** There's a maximum weight per piece. Heavy card stock on a large format can push you over it, so check before you print several thousand.

**The indicia.** Your piece needs the correct postal marking and a simplified address block — something like "Local Postal Customer" rather than a name. Print shops handle this routinely; if you're doing it yourself, get the current template from USPS.

**Bundling.** Pieces have to arrive at the post office in bundles of a set size, with facing slips and completed paperwork. This is manual, tedious, and the most common reason a first-time EDDM drop takes longer than expected.

**The safest move:** use a printer who does EDDM regularly. They know the current specs, and the cost difference is small compared to a rejected run.

## Who EDDM works for

**Businesses with a geographic customer base.** Restaurants, dentists, gyms, home services, salons, local retail. If your customers come from within a few miles, blanketing those miles makes sense.

**New locations.** Nothing announces an opening to a neighborhood faster.

**Offers with broad appeal.** Everyone eats. Everyone has a roof. The wider the appeal, the better untargeted mail performs.

## Who it doesn't work for

**Narrow or niche audiences.** If one household in fifty is a plausible customer, you're paying to reach forty-nine who aren't. Targeted mail with a real list beats EDDM here, even at a higher cost per piece.

**Businesses without a service area.** If you sell nationally online, geography isn't your filter.

**Anyone expecting immediate, trackable response.** Mail works, but it works slower and less legibly than a click. Which brings us to the mistakes.

## Common EDDM mistakes

**No way to tell if it worked.** The big one. Use a distinct phone number, a coupon code, a dedicated landing page — anything that separates mail response from everything else. Without it you'll have an opinion, not a result.

**Mailing once.** A single drop into a neighborhood is a coin flip. The businesses that get results from mail send to the same routes repeatedly, so the piece becomes familiar rather than novel.

**Choosing routes by convenience.** Nearest isn't the same as best. Use the demographic filters — a route half a mile further away with a better income match often outperforms.

**Burying the offer.** People decide in about a second, standing over a recycling bin. One offer, large, obvious. Not three.

**Skipping the design.** A cheap-looking piece signals a cheap business. The design is the message.

## The version most people don't know about

There's a cheaper way to reach a neighborhood than mailing it yourself: share the piece.

In a co-op or shared mailer, several non-competing local businesses appear on one card sent to the same routes. You split the postage and printing, so the per-household cost drops well below what a solo EDDM drop costs. The tradeoff is that you're sharing attention with the other advertisers on the card.

For a small business testing whether mail works at all, that tradeoff is usually worth it — it's a much cheaper first experiment than committing to a full solo run.

That's one of the two ways our [direct mail service](/for-businesses/direct-mail) works. We run a local co-op newsletter in the neighborhoods we serve, with one advertiser per category, and we run custom solo campaigns anywhere in the US through our USPS partnership. Whichever fits, we handle the specs, the bundling, and the paperwork.`,
    faqs: [
      {
        q: "What is EDDM?",
        a: "Every Door Direct Mail, a USPS program that lets you send mail to every address on selected postal carrier routes without buying a mailing list. You choose routes rather than individual recipients, which is what makes it cheaper than addressed direct mail.",
      },
      {
        q: "How much does EDDM cost?",
        a: "Postage per piece is well below first-class rates, and printing is usually the larger cost. Together they typically land in the range of a few tens of cents per household, so mailing a thousand homes runs to a few hundred dollars rather than a few thousand. Check the USPS EDDM page for current postage rates before budgeting.",
      },
      {
        q: "What are the requirements for EDDM?",
        a: "Your piece must meet USPS flat-size dimensions — larger than a standard postcard — stay under the maximum weight, carry the correct indicia and a simplified address block, and arrive at the post office bundled with facing slips and paperwork. Using a printer who does EDDM regularly removes most of this risk.",
      },
      {
        q: "Do I need a mailing list for EDDM?",
        a: "No. That's the defining feature. You select carrier routes and every address on them receives your piece, so there's no list to buy, build, or maintain.",
      },
      {
        q: "Is EDDM worth it for a small business?",
        a: "It's worth testing if your customers come from a defined geographic area and your offer has broad appeal. It's a poor fit for narrow audiences, because you're paying to reach every household whether or not they could ever buy from you. A shared or co-op mailer is usually the cheapest way to find out.",
      },
    ],
  },
  {
    slug: "ppc-management-pricing",
    title: "What paid ads management actually costs",
    metaTitle: "PPC Management Pricing: What Paid Ads Help Actually Costs",
    category: "Marketing Playbook",
    date: "Aug 8, 2026",
    publishAt: "2026-08-08",
    excerpt:
      "Most agency pricing pages won't name a number. Here's how PPC management is actually priced, what each model rewards, and the budget below which it isn't worth paying anyone.",
    image: "/images/adNetworkWallpaper.png",
    body: `Search for PPC management pricing and the top results are Reddit threads. That's not an accident. Almost every agency page on the subject spends a thousand words explaining that it depends, then asks you to book a call.

It does depend. But the *structure* of the pricing is knowable, and so is the thing nobody explains: what each model quietly rewards the agency for doing.

## The three ways this gets priced

Most quotes you receive will be one of these, or a blend.

**Percentage of ad spend.** You pay a share of whatever you spend on ads. Commonly somewhere in the region of ten to twenty percent, often with a monthly minimum underneath it. Spend more, pay more.

**Flat monthly fee.** A fixed amount regardless of spend. Small-business retainers commonly start in the mid-hundreds and rise into the thousands depending on channels and complexity.

**Per channel or per project.** Priced by how many platforms are being run, or by a defined piece of work. Less common with larger agencies, more common with smaller shops and freelancers.

There's also **performance-based pricing** — a fee tied to leads or revenue. Rarer than it sounds, because it requires tracking both parties trust, and it usually comes with a base fee anyway.

![Comparison of percentage-of-spend, flat fee, and per-channel PPC pricing models](/images/adNetwork.png#half "The model matters more than the number")

## What each model rewards

This is the part worth understanding before you compare quotes.

**Percentage of spend rewards spending.** If your agency earns fifteen percent of your budget, their revenue rises when your budget rises. That isn't necessarily bad — often the right answer genuinely is to spend more on what's working. But the incentive is real, and it points one direction. Ask how they'd advise you to *cut* spend, and see whether the answer is convincing.

**Flat fees reward efficiency.** The agency earns the same whether you spend $2,000 or $20,000, so their incentive is to spend as little of their own time as possible. That can mean sharp, focused work. It can also mean your account gets looked at once a month.

**Per-channel pricing rewards adding channels.** Straightforward to understand, and the risk is equally straightforward: you can end up running four platforms when two were working.

**No model is dishonest.** Every one of them has a pull. Knowing which pull you're buying tells you what to watch.

## What the fee does and doesn't include

The single most common misunderstanding in this category.

**The management fee is not your ad spend.** Ad spend goes to Google, Meta, Amazon, or wherever you're advertising. It should be billed to your own payment method, in your own ad account. The management fee is what you pay a person to plan, build, run, and watch it.

**Usually included:** account setup, campaign structure, keyword or audience research, bid and budget management, reporting.

**Often not included:** creative — the actual images, video, and ad copy — landing pages, tracking implementation, and anything on your website. These get quoted separately more often than people expect. Ask.

**The question that saves arguments later:** "What's included, and what would be billed on top?" Get it written down.

## The budget where this stops making sense

Nobody selling ads management will volunteer this, so here it is.

Add the management fee to your monthly ad spend and work out what share of the total the fee represents.

If you're spending $1,000 a month on ads and paying $500 to have it managed, a third of your money is going to management. The campaigns now have to perform extraordinarily well just to cover the overhead, and at $1,000 of monthly spend there usually isn't enough data for anyone to optimise against.

**Rough guide:** below about a thousand a month in ad spend, paid management rarely pays for itself. You're better off running simple campaigns yourself, or spending that money on something else entirely, until the budget grows.

Between roughly one and three thousand a month, it's genuinely arguable and depends on how much your own time is worth.

Above that, management usually earns its fee — a competent operator will generally save more in wasted spend than they cost.

**Any agency willing to take your money at $500 a month of spend without saying this to you is telling you something about how they work.**

## Questions worth asking before you sign

**"Which model is this, and why that one for my business?"** A good answer connects the model to your situation. A bad answer is that it's just how they do it.

**"Who owns the ad accounts?"** They should be yours, in your name, from the start. If the agency owns the account, you lose your entire campaign history when you leave. This is the single most expensive mistake in this category.

**"What's the minimum commitment?"** Some ramp-up period is reasonable — ads take time to gather enough data to judge. Twelve months is not reasonable for a small business.

**"What happens if I want to reduce spend?"** Especially worth asking on a percentage model.

**"Who actually works on my account?"** The person selling is frequently not the person doing it.

**"What do I keep if we stop?"** Accounts, historical data, creative, tracking setup, landing pages. All of it should be yours.

## Cheap isn't the goal, and neither is expensive

A low fee attached to somebody logging in once a month will cost you far more in wasted ad spend than the fee saved. A high fee doesn't guarantee attention either.

What you're actually buying is someone's regular attention plus their judgment about where your money goes. Price it against that, not against a benchmark number.

If you'd rather not price ads management as a separate line at all, that's how [our paid ads management](/for-businesses/digital-ads) is set up — it runs as a project inside an on-demand plan, so it's covered by the plan rather than billed per channel. Ad spend still goes straight to the platforms and stays in your accounts, as it should anywhere.`,
    faqs: [
      {
        q: "How much does PPC management cost?",
        a: "It depends on the pricing model. Percentage-of-spend arrangements commonly run somewhere around ten to twenty percent of your ad budget, often with a monthly minimum. Flat monthly fees for small businesses commonly start in the mid-hundreds and rise with channels and complexity. Neither figure includes your actual ad spend.",
      },
      {
        q: "Is the management fee separate from ad spend?",
        a: "Yes, and it should always be. Ad spend goes directly to the advertising platform from your own account. The management fee is what you pay someone to run it. Be cautious with any arrangement that bundles the two, because it makes it hard to see what you're paying for.",
      },
      {
        q: "What's the minimum ad budget worth managing?",
        a: "As a rough guide, below about a thousand a month in ad spend, management fees tend to eat too large a share of the total, and there usually isn't enough data to optimise against. Between one and three thousand it's arguable. Above that, good management generally saves more than it costs.",
      },
      {
        q: "Is percentage of ad spend or a flat fee better?",
        a: "Neither is better in the abstract — they reward different behaviour. Percentage pricing gives the agency a reason to grow your budget. Flat fees give them a reason to spend less time on your account. Pick the pull you'd rather manage, and ask how they'd handle the obvious conflict.",
      },
      {
        q: "What should be included in PPC management?",
        a: "Typically account setup, campaign structure, research, bid and budget management, and reporting. Creative, landing pages, and tracking implementation are often quoted separately. Ask for the boundary in writing before you start.",
      },
    ],
  },
  {
    slug: "website-maintenance-cost",
    title: "What website maintenance actually costs",
    metaTitle: "What Website Maintenance Actually Costs",
    category: "Marketing Playbook",
    date: "Aug 8, 2026",
    publishAt: "2026-08-08",
    excerpt:
      "Website maintenance pricing ranges from nothing to thousands a month, and the gap is mostly about what's included. What you're really paying for, and what you can skip.",
    image: "/images/DigitalAuditWallpaper.png",
    body: `Ask three people what website maintenance costs and you'll get answers from zero to several thousand a month. All three can be right, because "maintenance" covers everything from renewing a domain once a year to having someone on call when the checkout breaks.

So the useful question isn't what it costs. It's what you're buying, and which parts you actually need.

## The costs you have whether or not you hire anyone

These exist even if you never pay a person. Budget them first.

**Domain registration.** Annual, and usually the cheapest line on the list.

**Hosting.** Monthly or annual. Shared hosting for a small brochure site is inexpensive; anything with a database, a store, or real traffic costs more.

**SSL certificate.** Often included with hosting now. Check rather than assume.

**Platform and plugin fees.** If you're on a website builder, that subscription is your platform cost. If you're on WordPress, it's whatever premium plugins and themes you're running.

**A small brochure site can run on very little.** A store with a booking system and a handful of paid integrations will cost meaningfully more before anyone touches it.

![The layers of website maintenance cost, from hosting up to ongoing support](/images/DigitalAudit.png "Hosting is the floor. Everything above it is a choice.")

## What you're paying a person for

This is where the range gets wide, and it comes down to which of these you're buying.

**Monitoring.** Someone notices when the site is down, slow, or broken — ideally before you do. Largely automated, cheap to provide, and genuinely valuable.

**Updates and patches.** Platform, plugin, and security updates. Boring, necessary, and the thing most neglected sites are missing. Skipping this is how small sites get hacked.

**Backups.** Automated, stored somewhere other than the site itself, and tested. Untested backups aren't backups.

**Content edits.** Changing hours, adding a service, swapping photos, publishing a post. The part most owners actually want and the part most quotes are vaguest about.

**Technical performance.** Page speed, mobile behaviour, broken links, the technical basics that affect search.

**Being on call.** Someone who answers when something breaks. This is what you're really paying for at the higher end, and it's worth more than it looks until the day you need it.

## Rough shape of the pricing

Hedged deliberately — rates move and vary a lot by market.

**Low end.** Little more than the platform costs, with automated updates and backups running unattended and nobody looking at it. Fine for a simple site that rarely changes.

**Middle.** A small monthly fee covering monitoring, updates, backups, and a limited amount of edit time. This is where most small businesses land and where the value is usually best.

**Higher end.** Larger monthly retainers including generous or unlimited edits, performance work, and fast response. Justified when the site is genuinely part of how you make money — bookings, orders, lead forms.

**What moves you up the range:** an online store, a booking system, custom code, frequent content changes, or a site where downtime costs you real money in an afternoon.

## What "unlimited edits" usually means

You'll see this a lot, and it's rarely dishonest — but it's rarely unlimited either.

It generally means **unlimited small requests, handled in a queue.** Change some text, swap an image, update your hours: yes. Build a new section, add a booking system, redesign a page: that's a project, quoted separately.

**Ask two questions.** What counts as an edit rather than a project? And how fast do edits get done — same day, same week, or whenever?

## What you can skip

Not everything on a maintenance quote is worth paying for.

**Monthly reports nobody reads.** If the report is the deliverable, that's a warning sign. Reporting should be a byproduct of work, not the work.

**SEO bundled into maintenance.** Real SEO is a separate discipline with separate effort. When it's folded into a maintenance fee it usually means very little of it is happening.

**Security add-ons on top of updates.** Keeping the platform patched and backed up is most of small-site security. Be sceptical of premium security tiers layered on top.

**A retainer for a site that never changes.** If you genuinely update your site once a year, you need hosting, automated backups, and someone's phone number. Not a monthly fee.

## Questions to ask before you sign

**"What exactly is included each month?"** In deliverables, not hours.

**"What counts as an edit versus a project?"** The most common source of surprise invoices.

**"How quickly do things get done?"** A cheap plan with a two-week turnaround is expensive when your hours are wrong going into a holiday weekend.

**"Where are the backups, and have they been tested?"** Ask when the last restore was attempted.

**"Who owns the hosting and the domain?"** Both should be in your name. If your maintenance provider owns your domain, leaving becomes a negotiation.

**"What happens if I stop?"** You should keep the site, the domain, the hosting access, and the content.

## The honest summary

For most small businesses, the right answer to [website maintenance](/for-businesses/website-builds-updates) is a modest monthly fee covering monitoring, updates, backups, and a reasonable amount of edit time — plus a clear understanding of what counts as a project.

Paying nothing and hoping is how sites go down quietly and stay down for a week. Paying a large retainer for a site that changes twice a year is money that would do more elsewhere.`,
    faqs: [
      {
        q: "How much does website maintenance cost?",
        a: "It depends almost entirely on what's included. Hosting and domain renewal are the unavoidable baseline and are usually modest. Paying someone for monitoring, updates, backups, and content edits adds a monthly fee that scales with how complex the site is and how quickly you need things done.",
      },
      {
        q: "Do I need to pay for website maintenance?",
        a: "You need hosting, a domain, and current security patches regardless. Whether you pay a person depends on whether you'll do the updates yourself and how costly downtime is for you. A site that takes orders or bookings is worth maintaining properly.",
      },
      {
        q: "What's included in website maintenance?",
        a: "Typically monitoring, platform and plugin updates, backups, basic technical performance checks, and some amount of content editing. Redesigns, new features, and new pages are usually quoted as separate projects.",
      },
      {
        q: "What does \"unlimited edits\" actually mean?",
        a: "Usually unlimited small requests handled in a queue — text changes, image swaps, hours updates. New sections, new functionality, and redesigns are projects, not edits. Ask where the line sits and how fast the queue moves.",
      },
      {
        q: "Can I maintain my own website?",
        a: "Yes, if you'll actually do it. That means applying updates promptly, keeping tested backups somewhere other than the site, and noticing when something breaks. Most owners intend to and then don't, which is the real argument for paying someone.",
      },
    ],
  },
];

// A post is live when it has no publishAt, or its publishAt date has passed. In
// development everything is visible so drafts can be reviewed locally before
// their public go-live date.
export function isLive(post: Post, now: number = Date.now()): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!post.publishAt) return true;
  return new Date(post.publishAt).getTime() <= now;
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
