# Supabase Email Configuration Guide

## Overview

This app uses Supabase Authentication with email/password and magic link (passwordless) authentication. For magic links to work, email must be properly configured in your Supabase project.

## Email Configuration Requirements

### 1. Enable Email Authentication

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Ensure **Email** provider is enabled

### 2. Configure Email Settings

Navigate to **Authentication** → **Email Templates** to configure:

#### Magic Link Email
- **Subject**: Customize the magic link email subject
- **Body**: Customize the email template
- **Redirect URL**: **CRITICAL** - This must be set to your app's URL

#### Password Reset Email
- Configure if you plan to use password reset functionality

### 3. Set Redirect URLs

**CRITICAL**: You must configure redirect URLs for magic links to work.

1. Go to **Authentication** → **URL Configuration**
2. Add your app's URLs to **Redirect URLs**:
   - For local development: `http://localhost:8081`, `exp://localhost:8081`
   - For web production: `https://yourdomain.com`
   - For Expo Go: `exp://your-project-slug`
   - For custom scheme: `fullstylist://` (matches your app.json scheme)

Example:
```
http://localhost:8081
exp://localhost:8081
fullstylist://
https://yourdomain.com
```

### 4. Email Provider Configuration

Supabase provides two options for sending emails:

#### Option A: Supabase Default (Free Tier - Limited)
- Uses Supabase's default email service
- Limited to 3 emails per hour on free tier
- Good for development and testing
- No additional configuration needed

#### Option B: Custom SMTP (Recommended for Production)
1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your SMTP provider:
   - **Host**: Your SMTP server (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)
   - **Port**: SMTP port (usually 587 for TLS)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password
   - **Sender email**: Email address to send from
   - **Sender name**: Display name for emails

Popular SMTP providers:
- **SendGrid**: Free tier available, 100 emails/day
- **Mailgun**: Free tier available, 5,000 emails/month
- **AWS SES**: Pay-as-you-go, very affordable
- **Gmail**: Requires app password, limited to personal accounts

### 5. Email Rate Limiting

Be aware of rate limits:
- **Free tier**: 3 emails per hour (Supabase default)
- **Custom SMTP**: Depends on your provider

If emails aren't being received:
1. Check rate limits haven't been exceeded
2. Check spam folder
3. Verify redirect URLs are configured correctly
4. Check SMTP settings if using custom SMTP

## Troubleshooting Magic Link Issues

### Emails Not Being Received

1. **Check Supabase Dashboard**:
   - Go to **Authentication** → **Users**
   - Check if the user exists and email is verified
   - Look for any error messages

2. **Check Email Logs**:
   - Supabase Dashboard → **Logs** → **Auth Logs**
   - Look for email sending errors

3. **Verify Redirect URLs**:
   - Ensure your app's URL is in the redirect URL list
   - For Expo, you may need multiple formats

4. **Check Spam Folder**:
   - Magic link emails sometimes go to spam
   - Check your spam/junk folder

5. **Rate Limiting**:
   - If using free tier, wait 1 hour between emails
   - Consider upgrading or using custom SMTP

6. **SMTP Configuration**:
   - If using custom SMTP, verify credentials are correct
   - Test SMTP connection in Supabase dashboard

### Common Error Messages

- **"Email rate limit exceeded"**: Wait 1 hour or configure custom SMTP
- **"Invalid redirect URL"**: Add your app URL to redirect URLs list
- **"Email not sent"**: Check SMTP configuration or Supabase email service status

## Testing Email Configuration

### Test Magic Link Flow

1. Use the login screen's "Use magic link instead" option
2. Enter your email
3. Check your email inbox (and spam folder)
4. Click the magic link
5. Should redirect to your app and sign you in

### Verify in Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Find your test user
3. Check **Email Confirmed** status
4. Review **Last Sign In** timestamp

## Development vs Production

### Development
- Use Supabase default email (free tier)
- Configure localhost redirect URLs
- Accept rate limiting for testing

### Production
- **Strongly recommended**: Configure custom SMTP
- Add production domain to redirect URLs
- Monitor email delivery rates
- Set up email monitoring/alerts

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)

## Current Project Configuration

**Project URL**: https://earlhvpckbcpvppvmxsd.supabase.co

**App Scheme**: `fullstylist://` (from app.json)

**Recommended Redirect URLs**:
- `http://localhost:8081` (Expo web dev)
- `exp://localhost:8081` (Expo Go)
- `fullstylist://` (Custom scheme)
- Your production domain (when deployed)
