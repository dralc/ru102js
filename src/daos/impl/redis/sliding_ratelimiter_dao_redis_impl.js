const redis = require('./redis_client');
/* eslint-disable no-unused-vars */
const keyGenerator = require('./redis_key_generator');
const timeUtils = require('../../../utils/time_utils');
/* eslint-enable */

/* eslint-disable no-unused-vars */

// Challenge 7
/**
 *
 * @param { string } name
 * @param { {interval:number, maxHits:number} } opts
 */
const hitSlidingWindow = async (name, opts) => {
  const client = redis.getClient();

  const key = keyGenerator.getKey(`limiter:${opts.interval}:${name}:${opts.maxHits}`);
  const timenow = timeUtils.getCurrentTimestampMillis();
  const val = `${timenow}-${Math.random()}`;
  const multi = client.multi();

  // Add a request 'hit'
  multi.zadd(key, timenow, val);

  // Remove any request hits that are no longer within the sliding window
  multi.zremrangebyscore(key, 0, (timenow - opts.interval));

  // Count the hits within the window
  multi.zcardAsync(key);

  const res = await multi.execAsync();
  const hits = res[2];

  if (hits > opts.maxHits) {
    return -1;
  }

  return opts.maxHits - res[2];
};
/* eslint-enable */

module.exports = {
  /**
   * Record a hit against a unique resource that is being
   * rate limited.  Will return 0 when the resource has hit
   * the rate limit.
   * @param {string} name - the unique name of the resource.
   * @param {Object} opts - object containing interval and maxHits details:
   *   {
   *     interval: 1,
   *     maxHits: 5
   *   }
   * @returns {Promise} - Promise that resolves to number of hits remaining,
   *   or 0 if the rate limit has been exceeded..
   */
  hit: hitSlidingWindow,
};
