# HYBRID ATHLETE PERFORMANCE LEDGER

**EDITORIAL BRUTALISM FOR TRANSPARENT SYSTEMS**

A comprehensive personal best tracking application designed with Antithesis Tools design language - embodying the duality of manifesto + machine for athletes who train across multiple disciplines.

## ✨ Features

### 📊 **Core Tracking**
- **Running PBs**: Track 5K, 10K, Half Marathon, and Marathon times
- **Strength PBs**: Monitor push-ups, pull-ups, and weighted exercises (DB press, goblet squats, DB rows)
- **Body Composition**: Track weight, body fat percentage, and lean mass
- **Historical Data**: Complete log of all entries with PB indicators

### 🎯 **NEW: Enhanced PB Dashboard**
- **Dual View Modes**: Toggle between Card View (large serif displays) and Table View (detailed logs)
- **Editorial Cards**: Each PB displayed in beautiful typography with change indicators
- **Subtle Improvement Markers**: Green side-borders for improved PBs (no heavy colors)
- **Quick Add Modal**: ⊕ button launches streamlined PB entry form
- **4-Week Reminder System**: Floating banner alerts when 28+ days since last PB test

### 🎯 **NEW: Estimations & Predictions**
- **Race Time Estimations**: Automatically calculate equivalent race times across distances using proven formulas (based on Jack Daniels' VDOT)
- **Strength Estimations**: Calculate 1RM estimates from your weighted exercises, progression suggestions for bodyweight exercises
- **Performance Predictions**: AI-powered predictions of future performance based on training trends for both running and strength
- **Training Recommendations**: Smart suggestions based on your performance patterns, including strength balance analysis

### 👤 **NEW: Personalization**
- **User Profile**: Set your name, age, experience level, and primary goals
- **Custom Goals**: Set target times and performance goals
- **Preferences**: Toggle estimations/predictions, choose units (metric/imperial)
- **Smart Reminders**: 4-week PB testing reminders

## 🚀 How to Use

1. **Choose Your View**: Toggle between Card View (editorial display) and Table View (detailed logs)
2. **Quick Add PBs**: Click ⊕ QUICK ADD for streamlined PB entry with calendar picker
3. **Track Progress**: Green side-borders automatically highlight improvements
4. **Monitor Trends**: 28-day body composition trends and progression indicators
5. **Get Insights**: See estimated race times and performance predictions
6. **Follow Recommendations**: Use AI-generated training suggestions to improve
7. **4-Week Reminders**: Floating banner alerts when it's time to retest PBs

## ⚡ **OPTIMIZED LAYOUT & PERFORMANCE**

### **Refactored Architecture**
- **Streamlined HTML**: Reduced from 626 to 400+ lines with semantic markup
- **Optimized CSS**: Clean grid system with 21 organized sections and improved performance
- **Enhanced JavaScript**: Modular, maintainable code with better error handling
- **Responsive Design**: Mobile-first approach with fluid breakpoints

### **Performance Improvements**
- **Faster Rendering**: Optimized DOM queries and reduced reflows
- **Better Memory Usage**: Efficient event listeners and state management
- **Improved Accessibility**: Proper ARIA labels and semantic HTML
- **Enhanced UX**: Smoother animations and better interaction feedback

### **Layout Optimizations**
- **CSS Grid System**: Modern layout with better browser support
- **Flexible Components**: Reusable, composable design elements
- **Print-Friendly**: Optimized for printing PB summaries
- **Cross-Browser**: Consistent experience across all modern browsers

## 🧮 **Estimation Algorithms**

### Race Time Predictions
Uses **Riegel's Formula**: `T2 = T1 × (D2/D1)^1.06`
- Based on your current PB in one distance, estimates equivalent times for other distances
- Accounts for the non-linear relationship between distance and pace

### Strength Estimations
Uses **Epley Formula** for 1RM: `1RM = weight × (1 + reps/30)`
- **Weighted Exercises**: Shows estimated 1RM and suggested rep ranges at different percentages
- **Bodyweight Exercises**: Suggests progressions (standard → diamond → one-arm push-ups)
- **Balance Analysis**: Identifies strength imbalances between push/pull exercises

### Performance Predictions
- **Linear Regression Analysis** on your last 5 PBs
- Predicts likely performance 4 weeks ahead based on current trends
- Works for both running times and strength scores
- Helps with goal setting and training planning

### Training Recommendations
- Analyzes your PB frequency and training patterns
- Suggests training modifications based on performance plateaus
- **Strength-Specific**: Balance recommendations, progression suggestions
- Tailored to your experience level and primary goals

## 💾 **Data Storage**
- All data stored locally in your browser (no server required)
- Export/import functionality for data backup
- Privacy-focused - your data never leaves your device

## 🎨 **Design Philosophy: Antithesis Tools**
- **Authentic Typography**: PP Editorial New (Thin) for manifesto headers, PP Neue Montreal Mono (Medium) for system data
- **Editorial Brutalism**: Manifesto-style headers with precise ledger data
- **Typography Duality**: Serif for human emotion, mono for system utility
- **Black/White Precision**: 90% monochrome with functional red/green accents
- **Gasp Animation System**: Subtle breathing animations on interactions
- **8px Grid System**: Mathematically precise spacing and alignment
- **Colon DNA**: All system headers end with ":" for consistency

## 📊 **Examples in Action**

**ANTITHESIS PB TRACKER IN ACTION:**
```
┌─ CARD VIEW ──────────────────────────────────────┐
│  [CARD VIEW] [TABLE VIEW]           ⊕ QUICK ADD  │
├──────────────────────────────────────────────────┤
│ RUNNING:                                         │
│  ┌─ 5K ────┐  ┌─ 10K ───┐  ┌─ HALF MARATHON ─┐  │
│  │ 22:30   │  │ --:--   │  │ --:--           │  │ ← Large serif values
│  │ ↓ FASTER│  │         │  │ ~1:42:15        │  │ ← Green side-border for improvements
│  └─────────┘  └─────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────┘

⸻ TIME TO RE-TEST YOUR PERSONAL BESTS (28 DAYS PASSED) ×
                  ↑ Floating banner reminder

INTERACTION FEATURES:
• Editorial pill buttons for category selection
• Calendar picker for precise date entry
• Auto-save prevents data loss during entry
• Gasp animations on PB updates
• Responsive design: desktop grid → mobile stack
```

**MANIFESTO + MACHINE DUALITY:**
- **Expressive Headers**: "HYBRID ATHLETE:" in editorial serif
- **Precise Data**: All metrics in monospace ledger format  
- **System Commands**: "SAVE DATA", "CONFIG", "CLEAR ALL"
- **Transparent Logic**: All calculations and estimations visible

## 📱 **File Structure**
```
track-pb/
├── index.html      # Main application structure
├── styles.css      # All styling and themes
├── script.js       # Application logic and algorithms
└── README.md       # This documentation
```

## 🔮 **Future Enhancements**
- Export data to CSV/JSON
- Training plan generator
- Social sharing of achievements
- Integration with fitness trackers
- Advanced analytics and charts

---

**Built for hybrid athletes who want to excel in multiple fitness domains! 💪**
