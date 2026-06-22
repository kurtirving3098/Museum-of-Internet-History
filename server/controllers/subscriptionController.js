const Subscription = require('../models/Subscription');
const User         = require('../models/User');

// ─── Static plan data ────────────────────────────────────────────────────────
const PLANS = [
  {
    plan:        'monthly',
    label:       'Monthly',
    price:       10,
    currency:    'USD',
    billing_period: 'per month',
    description: 'Unlimited digs, 5 submissions a day, unlimited saves.',
  },
  {
    plan:        'yearly',
    label:       'Yearly',
    price:       120,
    currency:    'USD',
    billing_period: 'per year',
    description: 'Same paid benefits as monthly, billed once a year.',
  },
];

// ─── GET /api/subscriptions/plans ───────────────────────────────────────────
// Static plan list for the pricing page. Public — no auth required, since a
// visitor should be able to see pricing before signing up.
const getPlans = (req, res) => {
  return res.status(200).json({
    success: true,
    data:    PLANS,
  });
};

// ─── POST /api/subscriptions/subscribe ──────────────────────────────────────
// Simulated payment flow — no Stripe, no real charge. Treats the request as
// an immediately successful payment: creates a Subscription doc and flips
// User.tier to "paid" in the same request.
const subscribe = async (req, res, next) => {
  try {
    const user = req.user;
    const { plan } = req.body;

    const validPlans = PLANS.map(p => p.plan);

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: `A valid plan is required. Choose ${validPlans.join(' or ')}.`,
      });
    }

    // Guard against double-subscribing — if there's already an active
    // subscription, creating a second one would leave it ambiguous which one
    // cancel() should act on later.
    const existingActive = await Subscription.findOne({
      userId: user._id,
      status: 'active',
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription.',
      });
    }

    const subscription = await Subscription.create({
      userId:     user._id,
      status:     'active',
      plan,
      start_date: Date.now(),
    });

    await User.findByIdAndUpdate(user._id, { tier: 'paid' });
    user.tier = 'paid'; // keep in-memory object in sync

    return res.status(201).json({
      success: true,
      message: 'Subscription activated.',
      data:    subscription,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/subscriptions/cancel ─────────────────────────────────────────
// Cancels the current user's own active subscription. Looked up by userId,
// not by an ID passed from the client, so a user can never cancel someone
// else's subscription by guessing an ID.
const cancel = async (req, res, next) => {
  try {
    const user = req.user;

    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: 'active',
    });

    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found.',
      });
    }

    activeSubscription.status   = 'cancelled';
    activeSubscription.end_date = Date.now();
    await activeSubscription.save();

    await User.findByIdAndUpdate(user._id, { tier: 'free' });
    user.tier = 'free';

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled.',
      data:    activeSubscription,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlans, subscribe, cancel };