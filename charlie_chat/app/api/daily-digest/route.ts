// app/api/daily-digest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createBrowserClient } from '@supabase/ssr';
import nodemailer from 'nodemailer';

// Product ID mapping
const PRODUCT_LOOKUP: Record<string, string> = {
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_MONTHLY_PRODUCT!]: 'Charlie Chat Monthly',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_ANNUAL_PRODUCT!]: 'Charlie Chat Annual',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_MONTHLY_PRODUCT!]: 'Charlie Chat Plus Monthly',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PLUS_ANNUAL_PRODUCT!]: 'Charlie Chat Plus Annual',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_MONTHLY_PRODUCT!]: 'Charlie Chat Pro Monthly',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_PRO_ANNUAL_PRODUCT!]: 'Charlie Chat Pro Annual',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_25_PACK_PRODUCT!]: 'Charlie Chat 25 Pack',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_50_PACK_PRODUCT!]: 'Charlie Chat 50 Pack',
    [process.env.NEXT_PUBLIC_CHARLIE_CHAT_100_PACK_PRODUCT!]: 'Charlie Chat 100 Pack'
};

// Email recipients - update this list as needed
const EMAIL_RECIPIENTS = [
    'dlackner@hotmail.com',

];

interface NewUser {
    email: string;
    created_at: string;
}

interface CreditPurchase {
    user_id: string;
    credit_amount: number;
    purchased_at: string;
    metadata: {
        amount: string;
        userId: string;
        userClass: string;
    };
    profiles: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

interface NewSubscription {
    user_id: string;
    created_at: string;
    metadata: {
        plan: string;
        userId: string;
        productId: string;
        product_id: string;
    };
    profiles: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

export async function GET(req: NextRequest) {
    try {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
        );

        // FOR TESTING: Use July 1, 2024 instead of yesterday
        const testDate = '2024-07-01';
        const yesterdayStart = testDate;

        //USE THIS WHEN DONE TESTING
        //const yesterday = new Date();
        //yesterday.setDate(yesterday.getDate() - 1);
        //const yesterdayStart = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

        console.log(`📅 Fetching data for: ${yesterdayStart}`);

        // 1. Get new users from yesterday (from profiles table)
        const { data: newUsers, error: usersError } = await supabase
            .from('profiles')
            .select('user_id, email, first_name, last_name, created_at')
            .gte('created_at', `${yesterdayStart}T00:00:00`)
            .lt('created_at', `${yesterdayStart}T23:59:59`)
            .order('created_at', { ascending: true });

        if (usersError) {
            console.error('Error fetching new users:', usersError);
        }

        // 2. Get credit purchases from yesterday
        const { data: creditPurchases, error: purchasesError } = await supabase
            .from('credit_purchases')
            .select('user_id, credit_amount, purchased_at, metadata')
            .gte('purchased_at', `${yesterdayStart}T00:00:00`)
            .lt('purchased_at', `${yesterdayStart}T23:59:59`)
            .eq('status', 'succeeded')
            .order('purchased_at', { ascending: true });

        if (purchasesError) {
            console.error('Error fetching credit purchases:', purchasesError);
        }

        // 3. Get new subscriptions from yesterday
        const { data: newSubscriptions, error: subscriptionsError } = await supabase
            .from('subscriptions')
            .select('user_id, created_at, metadata')
            .gte('created_at', `${yesterdayStart}T00:00:00`)
            .lt('created_at', `${yesterdayStart}T23:59:59`)
            .eq('status', 'active')
            .order('created_at', { ascending: true });

        if (subscriptionsError) {
            console.error('Error fetching new subscriptions:', subscriptionsError);
        }

        // 4. Get user details for purchases and subscriptions
        const allUserIds = [
            ...(creditPurchases?.map(p => p.user_id) || []),
            ...(newSubscriptions?.map(s => s.user_id) || [])
        ];

        const { data: userProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, email, first_name, last_name')
            .in('user_id', allUserIds);

        if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
        }

        // Create lookup map for user details
        const userLookup = (userProfiles || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
        }, {} as Record<string, any>);

        // TEMPORARY: Test email with mock data
        const mockUsers = [
            { email: 'test1@example.com', created_at: '2024-07-01T10:30:00Z', first_name: 'John', last_name: 'Doe' },
            { email: 'test2@example.com', created_at: '2024-07-01T14:15:00Z', first_name: 'Jane', last_name: 'Smith' }
        ];

        const mockPurchases = [
            {
                user_id: '123',
                credit_amount: 25,
                purchased_at: '2024-07-01T11:00:00Z',
                metadata: { amount: '25', userId: '123', userClass: 'charlie_chat' },
                profiles: { first_name: 'Mike', last_name: 'Wilson', email: 'mike@example.com' }
            }
        ];
        // Override with mock data for testing
        const users = mockUsers;
        const purchases = mockPurchases;
        const subscriptions: NewSubscription[] = [];
        const totalCredits = 25;


        // Process and format data
        /*const users = (newUsers || []) as any[];
        const purchases = (creditPurchases || []).map(purchase => ({
            ...purchase,
            profiles: userLookup[purchase.user_id] || { first_name: '', last_name: '', email: 'Unknown' }
        })) as any[];
        const subscriptions = (newSubscriptions || []).map(subscription => ({
            ...subscription,
            profiles: userLookup[subscription.user_id] || { first_name: '', last_name: '', email: 'Unknown' }
        })) as any[];

        // Calculate totals
        const totalCredits = purchases.reduce((sum, purchase) => {
            return sum + parseInt(purchase.metadata?.amount || '0');
        }, 0);*/

        // Generate email content
        const emailContent = generateEmailContent({
            date: yesterdayStart,
            users,
            purchases,
            subscriptions,
            totalCredits
        });


        // Send email
        if (users.length > 0 || purchases.length > 0 || subscriptions.length > 0) {
            await sendEmail(emailContent, yesterdayStart);
            console.log('✅ Daily digest email sent successfully');
        } else {
            console.log('📭 No activity yesterday - skipping email');
        }

        return NextResponse.json({
            success: true,
            date: yesterdayStart,
            summary: {
                newUsers: users.length,
                creditPurchases: purchases.length,
                newSubscriptions: subscriptions.length,
                totalCredits
            },
            data: {
                users,
                purchases,
                subscriptions
            }
        });

    } catch (error) {
        console.error('❌ Daily digest error:', error);
        return NextResponse.json(
            { error: 'Failed to generate daily digest' },
            { status: 500 }
        );
    }
}

function generateEmailContent({ date, users, purchases, subscriptions, totalCredits }: {
    date: string;
    users: NewUser[];
    purchases: CreditPurchase[];
    subscriptions: NewSubscription[];
    totalCredits: number;
}) {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatName = (first_name: string, last_name: string, email: string) => {
        if (first_name && last_name) {
            return `${first_name} ${last_name} (${email})`;
        }
        return email;
    };

    return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>📊 Daily Activity Report - ${new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Summary</h3>
          <p><strong>New Users:</strong> ${users.length}</p>
          <p><strong>Credit Purchases:</strong> ${purchases.length} (${totalCredits} total credits)</p>
          <p><strong>New Subscriptions:</strong> ${subscriptions.length}</p>
        </div>

        ${users.length > 0 ? `
          <h3>👤 New Users (${users.length})</h3>
          <ul>
            ${users.map(user => `
              <li>${user.email} <em>(${formatTime(user.created_at)})</em></li>
            `).join('')}
          </ul>
        ` : ''}

        ${purchases.length > 0 ? `
          <h3>💳 Credit Purchases (${purchases.length})</h3>
          <ul>
            ${purchases.map(purchase => `
              <li>
                ${formatName(purchase.profiles.first_name, purchase.profiles.last_name, purchase.profiles.email)}: 
                <strong>${purchase.metadata?.amount || purchase.credit_amount} credits</strong> 
                (${purchase.metadata?.userClass || 'unknown'}) 
                <em>(${formatTime(purchase.purchased_at)})</em>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${subscriptions.length > 0 ? `
          <h3>🔄 New Subscriptions (${subscriptions.length})</h3>
          <ul>
            ${subscriptions.map(subscription => {
        const productName = PRODUCT_LOOKUP[subscription.metadata?.productId || subscription.metadata?.product_id] || 'Unknown Product';
        return `
                <li>
                  ${formatName(subscription.profiles.first_name, subscription.profiles.last_name, subscription.profiles.email)}: 
                  <strong>${productName}</strong> 
                  <em>(${formatTime(subscription.created_at)})</em>
                </li>
              `;
    }).join('')}
          </ul>
        ` : ''}

        ${users.length === 0 && purchases.length === 0 && subscriptions.length === 0 ? `
          <p><em>No activity yesterday.</em></p>
        ` : ''}

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Generated automatically on ${new Date().toLocaleString()}
        </p>
      </body>
    </html>
  `;
}

async function sendEmail(htmlContent: string, date: string) {
    // Create transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER, // your-email@gmail.com
            pass: process.env.GMAIL_APP_PASSWORD // Gmail app password
        }
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: EMAIL_RECIPIENTS.join(', '),
        subject: `Daily Activity Report - ${new Date(date).toLocaleDateString()}`,
        html: htmlContent
    };

    await transporter.sendMail(mailOptions);
}

// Allow manual testing via GET request
export async function POST(req: NextRequest) {
    // Same logic as GET - allows for manual triggering
    return GET(req);
}