# BeatSpace - Complete Production Guide

## Overview
BeatSpace is an outdoor advertising marketplace connecting Buyers (brands/agencies) with advertising asset owners through a commission-based platform. This guide outlines the complete business process flow from asset creation to campaign completion.

## User Roles
- **Admin**: System administrator managing assets, users, and transactions
- **Buyer**: Brands/agencies looking to book advertising assets
- **Seller**: Asset owners (future implementation)

## Complete Business Process Flow

### Phase 1: Admin Setup & Asset Management

#### 1.1 Admin Login
- **URL**: `/admin/dashboard`  
- **Credentials**: admin@beatspace.com / admin123
- **Dashboard**: Overview of users, assets, campaigns, and pending reviews

#### 1.2 Asset Creation Process
1. **Navigate**: Admin Dashboard → Assets Tab
2. **Click**: "Add New Asset" button
3. **Fill Asset Information**:
   - **Name**: Descriptive asset name (e.g., "Gulshan Avenue Digital Billboard")
   - **Type**: Select from dropdown (Billboard, Bridge, Bus Stop, Market, Railway Station, Others)
   - **Address**: Full address with landmarks
   - **Dimensions**: Size specifications (e.g., "20ft x 10ft")
   - **Condition**: Asset condition (Excellent, Good, Fair, Poor)
   - **District**: Bangladesh district selection
   - **Division**: Bangladesh division selection
   - **Location**: GPS coordinates (lat, lng)
   - **Seller Information**: Select existing seller or add new
   - **Pricing**: Set 3-month, 6-month, 12-month rates
   - **Description**: Detailed asset description
   - **Specifications**: Technical details (lighting, material, etc.)
   - **Visibility Score**: 1-10 rating
   - **Traffic Volume**: Very High, High, Medium, Low
   - **Photos**: Upload multiple asset images
   - **Status**: Set to "Available" to make bookable
4. **Save**: Asset becomes available in marketplace

#### 1.3 User Management
1. **Navigate**: Admin Dashboard → Users Tab
2. **Review**: Pending user registrations (status: "pending")
3. **Approve Users**:
   - Click dropdown actions → "Approve User"
   - User status changes to "approved"
   - User can now login and access platform

### Phase 2: Buyer Registration & Approval

#### 2.1 Buyer Registration
1. **URL**: `/register`
2. **Fill Registration Form**:
   - **Email**: Business email address
   - **Password**: Secure password
   - **Company Name**: Official company name
   - **Contact Name**: Primary contact person
   - **Phone**: Business phone number
   - **Role**: Select "Buyer"
3. **Submit**: Account created with "pending" status
4. **Wait**: Admin approval required before login

#### 2.2 Admin Approval Process
1. **Admin Login**: Check Users tab for pending registrations
2. **Review**: Buyer information and credentials
3. **Approve**: Change status from "pending" to "approved"
4. **Notification**: Buyer can now login

### Phase 3: Campaign Creation & Asset Requests

#### 3.1 Buyer Campaign Creation
1. **Buyer Login**: `/buyer/dashboard`
2. **Navigate**: Campaigns Tab → "Create Campaign"
3. **Fill Campaign Details**:
   - **Campaign Name**: Descriptive campaign name
   - **Description**: Campaign objectives and details
   - **Budget**: Total campaign budget
   - **Start Date**: Campaign start date
   - **End Date**: Campaign end date
   - **Notes**: Additional campaign information
4. **Status**: Campaign created with "Draft" status

#### 3.2 Asset Request Process
1. **Navigate**: Marketplace → Browse available assets
2. **Select Asset**: Click "View Details" on desired asset
3. **Request Offer**: Click "Request Best Offer" button
4. **Fill Request Form**:
   - **Campaign**: Select existing campaign (auto-populated if navigated from campaign)
   - **Estimated Budget**: Buyer's budget estimate
   - **Contract Duration**: 1 month, 3 months, 6 months, 12 months
   - **Tentative Start Date**: When asset should start
   - **Service Bundles**: Printing, Setup, Monitoring options
   - **Special Requirements**: Any specific needs
   - **Notes**: Additional information
5. **Submit**: Offer request created with "Pending" status

### Phase 4: Admin Quote & Approval Process

#### 4.1 Review Offer Requests
1. **Admin Login**: Admin Dashboard → Offer Mediation Tab
2. **View**: All pending offer requests with details
3. **Review Information**:
   - Asset details and location
   - Buyer's estimated budget
   - Campaign information
   - Duration and requirements

#### 4.2 Provide Price Quotation
1. **Click**: Dropdown Actions → "View Details"
2. **Analyze**: Asset pricing and buyer requirements
3. **Quote Price**: Provide final quotation to buyer
4. **Update Status**: Mark as "Quoted" or "In Process"
5. **Communication**: System notifies buyer of quote

#### 4.3 Buyer Response to Quote
1. **Buyer Login**: Check Requested Offers tab
2. **Review**: Admin's price quotation
3. **Decision**: Accept or negotiate quote
4. **Response**: Buyer confirms acceptance

### Phase 5: Campaign Activation & Asset Booking

#### 5.1 Admin Campaign Activation
1. **Navigate**: Admin Dashboard → Campaigns Tab
2. **Find**: Campaign with accepted offers
3. **Review**: All associated assets and confirmations
4. **Activate**: Change campaign status to "Live"
5. **Asset Booking**: System automatically:
   - Changes asset status to "Booked"
   - Updates marketplace availability
   - Sets booking duration per offer terms

#### 5.2 System Updates
1. **Asset Status**: Changes to "Booked" in marketplace
2. **Campaign Status**: Shows as "Live" 
3. **Buyer Dashboard**: Updates automatically:
   - My Assets tab shows booked assets
   - Campaign status updates
   - Asset expiry dates calculated

### Phase 6: Ongoing Management & Monitoring

#### 6.1 Buyer Asset Management
1. **My Assets Tab**: View all booked assets with:
   - **List View**: Tabular view with name, campaign, status, duration, expiry
   - **Map View**: Geographic distribution of assets
   - **Campaign View**: Assets grouped by campaign
2. **Campaign Management**: Track campaign performance
3. **Offer Requests**: Monitor pending and active requests

#### 6.2 Admin Monitoring
1. **Asset Status**: Track asset utilization
2. **Campaign Oversight**: Monitor active campaigns
3. **Financial Tracking**: Revenue and commission management
4. **User Management**: Ongoing user approval and management

## Key Features & Functionalities

### Dashboard Features
- **Real-time Updates**: All dashboards update automatically with status changes
- **Search & Pagination**: All data tables include search and pagination
- **Responsive Design**: Works on desktop and mobile devices
- **Notification System**: Custom notifications replace browser alerts

### Asset Management
- **Comprehensive Asset Data**: Full asset profiles with photos and specifications
- **Status Tracking**: Available → Booked → Available lifecycle
- **Geographic Information**: District, division, and GPS coordinates
- **Pricing Flexibility**: Multiple duration-based pricing options

### Campaign Management
- **Draft → Live Workflow**: Structured campaign approval process
- **Asset Association**: Link multiple assets to single campaign
- **Budget Management**: Track estimated vs actual costs
- **Duration Control**: Flexible booking periods

### Offer Request System
- **Structured Requests**: Detailed offer request forms
- **Admin Mediation**: Professional quote and approval process
- **Status Tracking**: Pending → Quoted → Accepted → Live flow
- **Service Bundles**: Additional service options

## Technical Architecture

### Frontend (React)
- **Component Structure**: Modular, reusable components
- **State Management**: React hooks and context
- **UI Library**: Shadcn/ui with Tailwind CSS
- **Routing**: Protected routes with role-based access

### Backend (FastAPI)
- **API Structure**: RESTful API endpoints
- **Authentication**: JWT-based with role-based access control
- **Database**: MongoDB with proper indexing
- **File Upload**: Cloudinary integration for images

### Database Schema
- **Users**: Role-based user management
- **Assets**: Comprehensive asset information
- **Campaigns**: Campaign lifecycle management
- **Offer Requests**: Request and quote management

## Production Deployment Checklist

### Security
- [ ] Change default admin password
- [ ] Implement proper password policies
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Implement rate limiting

### Performance
- [ ] Set up database indexing
- [ ] Implement caching strategy
- [ ] Optimize image delivery
- [ ] Set up CDN for static assets

### Monitoring
- [ ] Error tracking and logging
- [ ] Performance monitoring
- [ ] User analytics
- [ ] System health checks

### Business
- [ ] Configure commission rates
- [ ] Set up payment processing
- [ ] Implement billing system
- [ ] Create reporting dashboards

## Future Enhancements

### Phase 2 Features
- **Seller Portal**: Direct seller asset management
- **Payment Integration**: Stripe/PayPal integration
- **Advanced Analytics**: Detailed performance metrics
- **Mobile App**: iOS and Android applications

### Phase 3 Features
- **AI Recommendations**: Smart asset suggestions
- **Real-time Bidding**: Auction-based pricing
- **Performance Tracking**: Campaign effectiveness metrics
- **Multi-language Support**: Bengali and English

## Support & Maintenance

### Regular Tasks
- **User Management**: Weekly user approval reviews
- **Asset Updates**: Monthly asset status reviews
- **System Updates**: Regular security and feature updates
- **Data Backup**: Daily automated backups

### Troubleshooting
- **Common Issues**: User access, asset visibility, campaign status
- **Support Channels**: Admin portal, email, phone support
- **Documentation**: Keep this guide updated with new features

---

## Quick Reference

### Default Credentials
- **Admin**: admin@beatspace.com / admin123

### Important URLs
- **Admin Dashboard**: `/admin/dashboard`
- **Buyer Dashboard**: `/buyer/dashboard`
- **Marketplace**: `/marketplace`
- **Registration**: `/register`
- **Login**: `/login`

### Status Workflows
- **User**: pending → approved
- **Asset**: Available → Booked → Available
- **Campaign**: Draft → Live → Completed
- **Offer Request**: Pending → Quoted → Accepted → Live

### Contact & Updates
This guide should be updated whenever new features are added or business processes change. Keep it as the single source of truth for BeatSpace operations.

---

*Last Updated: [Current Date]*
*Version: 1.0*