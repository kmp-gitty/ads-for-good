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
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
