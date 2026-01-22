# Netlify Function Timeout Configuration

## Issue
The function is timing out at 30 seconds despite `netlify.toml` configuration of 120 seconds.

## Netlify Platform Limits

Netlify Functions have platform-specific timeout limits:

- **Free/Starter tier**: 10 seconds maximum
- **Pro tier**: 26 seconds default, can be extended to **120 seconds** with configuration
- **Business/Enterprise**: Up to 120 seconds

## Current Configuration

The `netlify.toml` file specifies:
```toml
[functions."ai-job-runner"]
  timeout = 120
```

## Verification Steps

1. **Check Netlify Plan**: Verify you're on Pro tier or higher
   - Go to Netlify Dashboard → Site Settings → Plan
   - Pro tier is required for 120-second timeouts

2. **Verify Configuration is Applied**:
   - The timeout configuration in `netlify.toml` should be automatically applied
   - If not working, try redeploying after ensuring the file is committed

3. **Check Function Logs**:
   - The logs show "Duration: 30000 ms" which suggests a 30-second limit is being enforced
   - This might indicate the configuration isn't being applied, or the plan doesn't support it

## Potential Solutions

1. **Upgrade Plan**: If on Free/Starter tier, upgrade to Pro for 120-second support

2. **Verify Configuration**: Ensure `netlify.toml` is in the repository root and committed

3. **Alternative**: If timeout can't be extended, consider:
   - Using background jobs with webhooks
   - Breaking the process into smaller chunks
   - Using Netlify Background Functions (if available)

## Testing

After verifying the plan and configuration, test again. The new logging will show:
- When Gemini API call starts
- How long each step takes
- Where exactly the timeout occurs
