import mongoose from 'mongoose';

const CreditAccountSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'Secured', 
      'Unsecured', 
      'Credit Card', 
      'Credit Card (Revolving)',
      'Personal Loan',
      'Personal Loan (Installment)',
      'Home Loan',
      'Auto Loan', 
      'Business Loan',
      'Gold Loan',
      'Loan Against Property',
      'Two Wheeler Loan',
      'Other Loan',
      'Loan', 
      'Other'
    ],
    default: 'Other'
  },
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  amountOverdue: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  sanctionedAmount: {
    type: Number,
    default: 0
  },
  dateOpened: {
    type: Date
  },
  dateClosed: {
    type: Date
  },
  status: {
    type: String,
    enum: [
      'Active', 
      'Active - Regular',
      'Active - Irregular', 
      'Closed', 
      'Closed - Regular',
      'Closed - Irregular',
      'Settled', 
      'Written Off',
      'Restructured',
      'Wilful Default',
      'Sub-standard',
      'Doubtful',
      'Loss'
    ],
    default: 'Active'
  },
  paymentHistory: {
    type: String,
    trim: true
  }
});

const CreditReportSchema = new mongoose.Schema({
  fileHash: {
    type: String,
    unique: true,
    required: true
  },
  rawXmlUrl: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  basicDetails: {
    name: {
      type: String,
      trim: true
    },
    mobilePhone: {
      type: String,
      trim: true
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true
    },
    creditScore: {
      type: Number,
      min: 300,
      max: 900
    },
    dateOfBirth: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  reportSummary: {
    totalAccounts: {
      type: Number,
      default: 0
    },
    activeAccounts: {
      type: Number,
      default: 0
    },
    closedAccounts: {
      type: Number,
      default: 0
    },
    currentBalanceAmount: {
      type: Number,
      default: 0
    },
    securedAmount: {
      type: Number,
      default: 0
    },
    unsecuredAmount: {
      type: Number,
      default: 0
    },
    recentEnquiries: {
      type: Number,
      default: 0
    },
    oldestAccount: {
      type: Date
    },
    newestAccount: {
      type: Date
    }
  },
  creditAccounts: [CreditAccountSchema],
  enquiries: [{
    institution: String,
    date: Date,
    amount: Number,
    purpose: String
  }],
  reportDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
CreditReportSchema.index({ fileHash: 1 });
CreditReportSchema.index({ 'basicDetails.pan': 1 });
CreditReportSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
CreditReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for total debt
CreditReportSchema.virtual('totalDebt').get(function() {
  return this.reportSummary.securedAmount + this.reportSummary.unsecuredAmount;
});

// Virtual for account summary
CreditReportSchema.virtual('accountSummary').get(function() {
  return {
    total: this.reportSummary.totalAccounts,
    active: this.reportSummary.activeAccounts,
    closed: this.reportSummary.closedAccounts,
    activePercentage: this.reportSummary.totalAccounts > 0 
      ? Math.round((this.reportSummary.activeAccounts / this.reportSummary.totalAccounts) * 100) 
      : 0
  };
});

// Ensure virtual fields are serialized
CreditReportSchema.set('toJSON', { virtuals: true });
CreditReportSchema.set('toObject', { virtuals: true });

export default mongoose.model('CreditReport', CreditReportSchema);
