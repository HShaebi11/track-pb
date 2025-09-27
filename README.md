# 🏃‍♂️ Hybrid Athlete PB Tracker

A comprehensive personal best tracking application for athletes who train across multiple disciplines - running, strength training, and body composition.

## ✨ Features

### 📊 **Core Tracking**
- **Running PBs**: Track 5K, 10K, Half Marathon, and Marathon times
- **Strength PBs**: Monitor push-ups, pull-ups, and weighted exercises (DB press, goblet squats, DB rows)
- **Body Composition**: Track weight, body fat percentage, and lean mass
- **Historical Data**: Complete log of all entries with PB indicators

### 🎯 **NEW: Estimations & Predictions**
- **Race Time Estimations**: Automatically calculate equivalent race times across distances using proven formulas (based on Jack Daniels' VDOT)
- **Performance Predictions**: AI-powered predictions of future performance based on training trends
- **Training Recommendations**: Smart suggestions based on your performance patterns

### 👤 **NEW: Personalization**
- **User Profile**: Set your name, age, experience level, and primary goals
- **Custom Goals**: Set target times and performance goals
- **Preferences**: Toggle estimations/predictions, choose units (metric/imperial)
- **Smart Reminders**: 4-week PB testing reminders

## 🚀 How to Use

1. **First Time Setup**: Click the ⚙️ settings button to set up your profile and preferences
2. **Log Workouts**: Use the form to enter your daily training data
3. **Track Progress**: View your PBs with delta indicators showing improvement/decline
4. **Get Insights**: See estimated race times and performance predictions
5. **Follow Recommendations**: Use AI-generated training suggestions to improve

## 🧮 **Estimation Algorithms**

### Race Time Predictions
Uses **Riegel's Formula**: `T2 = T1 × (D2/D1)^1.06`
- Based on your current PB in one distance, estimates equivalent times for other distances
- Accounts for the non-linear relationship between distance and pace

### Performance Predictions
- **Linear Regression Analysis** on your last 5 PBs
- Predicts likely performance 4 weeks ahead based on current trends
- Helps with goal setting and training planning

### Training Recommendations
- Analyzes your PB frequency and training patterns
- Suggests training modifications based on performance plateaus
- Tailored to your experience level and primary goals

## 💾 **Data Storage**
- All data stored locally in your browser (no server required)
- Export/import functionality for data backup
- Privacy-focused - your data never leaves your device

## 🎨 **Technical Features**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Easy on the eyes for any time of day
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Fast**: Pure vanilla JavaScript, no dependencies

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
