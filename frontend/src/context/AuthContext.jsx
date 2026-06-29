import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userRecord, setUserRecord] = useState(null);
  const [profile, setProfile] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Toast Notification manager
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load session on boot
  useEffect(() => {
    const cachedUser = localStorage.getItem('civiverse_user');
    const cachedProfile = localStorage.getItem('civiverse_profile');
    if (cachedUser) {
      try {
        const u = JSON.parse(cachedUser);
        setCurrentUser(u.username);
        setUserRole(u.role || 'citizen');
        setUserRecord(u);
      } catch (e) {
        console.error(e);
      }
    }
    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save session helper
  const loginUser = (user, localProfile = null) => {
    localStorage.setItem('civiverse_user', JSON.stringify(user));
    setCurrentUser(user.username);
    setUserRole(user.role);
    setUserRecord(user);

    let finalProfile = localProfile;
    if (!finalProfile) {
      // Calculate level parameters from backend record
      let userXP = user.xp || 0;
      let points = user.points || 0;
      let level = 1;
      let xpNextLevel = 100;
      
      while (userXP >= xpNextLevel) {
        userXP -= xpNextLevel;
        level++;
        xpNextLevel = Math.round(xpNextLevel * 1.5);
      }

      const ranks = ['Civic Novice', 'Civic Guardian', 'Pothole Sentinel', 'Community Veteran', 'Civic Champion'];
      const levelName = user.role === 'admin' ? 'Municipal Officer' : ranks[Math.min(level - 1, ranks.length - 1)];

      finalProfile = {
        level: user.role === 'admin' ? 0 : level,
        xpCurrent: user.role === 'admin' ? 0 : userXP,
        xpNextLevel: user.role === 'admin' ? 100 : xpNextLevel,
        points: points,
        levelName: levelName,
        redeemedVouchers: []
      };
    }

    localStorage.setItem('civiverse_profile', JSON.stringify(finalProfile));
    setProfile(finalProfile);
  };

  // Logout helper
  const logoutUser = () => {
    localStorage.removeItem('civiverse_user');
    localStorage.removeItem('civiverse_profile');
    setCurrentUser(null);
    setUserRole(null);
    setUserRecord(null);
    setProfile(null);
    showToast('Logged out of session', 'info');
  };

  // Sync XP points
  const awardXP = async (amount, reason) => {
    if (!currentUser || userRole === 'admin') return;

    try {
      const response = await fetch(`/api/users/${currentUser}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpGained: amount })
      });

      if (!response.ok) throw new Error('Failed to sync XP with server');
      const updatedUser = await response.json();
      
      // Calculate new level boundaries
      let userXP = updatedUser.xp || 0;
      let points = updatedUser.points || 0;
      let level = 1;
      let xpNextLevel = 100;
      
      while (userXP >= xpNextLevel) {
        userXP -= xpNextLevel;
        level++;
        xpNextLevel = Math.round(xpNextLevel * 1.5);
      }

      const ranks = ['Civic Novice', 'Civic Guardian', 'Pothole Sentinel', 'Community Veteran', 'Civic Champion'];
      const levelName = ranks[Math.min(level - 1, ranks.length - 1)];

      const prevProfile = profile || {};
      const newProfile = {
        ...prevProfile,
        level,
        xpCurrent: userXP,
        xpNextLevel,
        points,
        levelName
      };

      localStorage.setItem('civiverse_profile', JSON.stringify(newProfile));
      setProfile(newProfile);

      // Trigger gamification toast
      showToast(`🏆 +${amount} XP: ${reason}`, 'success');

      // Check for level up
      if (prevProfile.level && level > prevProfile.level) {
        setTimeout(() => {
          showToast(`⚡ LEVEL UP! You are now Level ${level} (${levelName})!`, 'success');
        }, 1500);
      }

      // Sync active user record locally
      const updatedUserRecord = { ...userRecord, xp: updatedUser.xp, points: updatedUser.points, badge: updatedUser.badge };
      localStorage.setItem('civiverse_user', JSON.stringify(updatedUserRecord));
      setUserRecord(updatedUserRecord);

    } catch (error) {
      console.error('Error syncing XP with server:', error);
      showToast('Error syncing XP backend database', 'error');
    }
  };

  // Deduct points for rewards store purchases
  const deductPoints = (cost, voucherName) => {
    if (!profile || profile.points < cost) {
      showToast('Insufficient points balance!', 'warning');
      return false;
    }
    
    const updatedProfile = {
      ...profile,
      points: profile.points - cost,
      redeemedVouchers: [
        ...(profile.redeemedVouchers || []),
        { 
          name: voucherName, 
          code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          date: new Date().toLocaleDateString()
        }
      ]
    };
    
    localStorage.setItem('civiverse_profile', JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
    showToast(`Redeemed ${voucherName} successfully!`, 'success');
    return true;
  };

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userRecord, profile, loginUser, logoutUser, awardXP, deductPoints, showToast, toasts }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
