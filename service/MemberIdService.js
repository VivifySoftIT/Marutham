import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api';

/**
 * MemberIdService - Centralized service for managing member ID across the app
 * This service handles storing, retrieving, and resolving member IDs from various sources
 */
class MemberIdService {
  static currentMemberId = null;

  /**
   * Get the current user's member ID with fallback logic
   * @returns {Promise<number|null>} Member ID or null if not found
   */
  static async getCurrentUserMemberId() {
    try {
      // Return cached member ID if available
      if (this.currentMemberId) {
        console.log('MemberIdService - Using cached member ID:', this.currentMemberId);
        return this.currentMemberId;
      }

      // First check if memberId is already in AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('MemberIdService - Member ID found in storage:', storedMemberId);
        this.currentMemberId = parseInt(storedMemberId);
        return this.currentMemberId;
      }

      console.log('MemberIdService - Member ID not in storage, attempting to look up...');

      // If not, try to get it from user ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          // Try to get member by user ID
          console.log('MemberIdService - Trying GetByUserId with userId:', userId);
          const memberData = await ApiService.getMemberByUserId(userId);
          
          if (memberData && memberData.id) {
            await this.setMemberId(memberData.id);
            console.log('MemberIdService - Member found via GetByUserId:', memberData.id);
            return memberData.id;
          }
        } catch (error) {
          console.log('MemberIdService - GetByUserId failed, trying name search:', error);
        }
      }

      // Fallback: search by name
      if (fullName) {
        try {
          console.log('MemberIdService - Searching members by name:', fullName);
          const members = await ApiService.getMembers();
          const member = members.find(m => 
            m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
          );
          
          if (member) {
            await this.setMemberId(member.id);
            console.log('MemberIdService - Member found by name:', member.id);
            return member.id;
          }
        } catch (error) {
          console.log('MemberIdService - Name search failed:', error);
        }
      }

      console.log('MemberIdService - Could not find member ID');
      return null;
    } catch (error) {
      console.error('MemberIdService - Error getting member ID:', error);
      return null;
    }
  }

  /**
   * Set the member ID in both cache and AsyncStorage
   * @param {number} memberId - The member ID to store
   */
  static async setMemberId(memberId) {
    try {
      if (memberId) {
        this.currentMemberId = parseInt(memberId);
        await AsyncStorage.setItem('memberId', memberId.toString());
        console.log('MemberIdService - Member ID stored:', memberId);
      }
    } catch (error) {
      console.error('MemberIdService - Error storing member ID:', error);
    }
  }

  /**
   * Clear the member ID from both cache and AsyncStorage
   */
  static async clearMemberId() {
    try {
      this.currentMemberId = null;
      await AsyncStorage.removeItem('memberId');
      console.log('MemberIdService - Member ID cleared');
    } catch (error) {
      console.error('MemberIdService - Error clearing member ID:', error);
    }
  }

  /**
   * Get the cached member ID without async operations
   * @returns {number|null} Cached member ID or null
   */
  static getCachedMemberId() {
    return this.currentMemberId;
  }

  /**
   * Check if member ID is available (either cached or in storage)
   * @returns {Promise<boolean>} True if member ID is available
   */
  static async hasMemberId() {
    if (this.currentMemberId) {
      return true;
    }
    
    const storedMemberId = await AsyncStorage.getItem('memberId');
    return !!storedMemberId;
  }

  /**
   * Initialize member ID from storage (call this on app startup)
   */
  static async initializeMemberId() {
    try {
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        this.currentMemberId = parseInt(storedMemberId);
        console.log('MemberIdService - Initialized with stored member ID:', this.currentMemberId);
      }
    } catch (error) {
      console.error('MemberIdService - Error initializing member ID:', error);
    }
  }
}

export default MemberIdService;