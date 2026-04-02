import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';

// API Service for Alaigal Backend
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token
  async getToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Set auth token
  async setToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  // Remove auth token
  async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Generic request method
  async request(endpoint, method = 'GET', body = null, requiresAuth = true) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`API Request: ${method} ${url}`);
      
      const headers = {
        'Content-Type': 'application/json',
      };

      if (requiresAuth) {
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const config = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(body);
        console.log('Request Body:', body);
      }

      const response = await fetch(url, config);
      console.log(`API Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Don't log error for 404 on birthday-wish endpoint (expected when no wish found)
        const isBirthdayWishNotFound = endpoint.includes('birthday-wish') && response.status === 404;
        if (!isBirthdayWishNotFound) {
          console.error('API Error Response:', errorText);
        }
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP error! status: ${response.status}` };
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();
      console.log('API Response Data:', data);
      return data;
    } catch (error) {
      // Don't log error for 404 on birthday-wish endpoint (expected when no wish found)
      const isBirthdayWishNotFound = endpoint.includes('birthday-wish') && 
                                      error.message && 
                                      error.message.includes('No birthday wish found');
      if (!isBirthdayWishNotFound) {
        console.error(`API Error (${endpoint}):`, error);
      }
      throw error;
    }
  }

  // ==================== AUTH APIs ====================
  async login(username, password) {
    try {
      // Try SimpleAuth endpoint (no JWT, simpler)
      console.log('Trying SimpleAuth/login endpoint...');
      const response = await this.request('/api/SimpleAuth/login', 'POST', { username, password }, false);
      
      if (response.token) {
        await this.setToken(response.token);
        return response;
      }
      
      throw new Error('No token received');
    } catch (simpleAuthError) {
      console.log('SimpleAuth failed, trying main Auth/login...');
      
      try {
        // Fallback to main Auth endpoint
        const response = await this.request('/api/Auth/login', 'POST', { username, password }, false);
        if (response.token) {
          await this.setToken(response.token);
        }
        return response;
      } catch (authError) {
        console.log('Main Auth failed, trying Test/login...');
        
        try {
          // Last fallback to Test endpoint
          const testResponse = await this.request('/api/Test/login', 'POST', { username, password }, false);
          
          if (testResponse.success) {
            // Create a simple token for testing
            const token = btoa(JSON.stringify({
              username: testResponse.username,
              timestamp: Date.now()
            }));
            
            await this.setToken(token);
            
            return {
              token: token,
              user: {
                id: 1,
                username: testResponse.username,
                email: 'admin@alaigal.com',
                fullName: 'Administrator',
                role: 'Admin'
              }
            };
          } else {
            throw new Error(testResponse.message || 'Login failed');
          }
        } catch (testError) {
          console.error('All login endpoints failed');
          throw new Error('Login failed. Please contact support.');
        }
      }
    }
  }

  async register(userData) {
    return await this.request('/api/Auth/register', 'POST', userData, false);
  }

  async forgotPassword(email) {
    return await this.request('/api/Auth/forgot-password', 'POST', { email }, false);
  }

  async resetPassword(token, newPassword) {
    return await this.request('/api/Auth/reset-password', 'POST', { token, newPassword }, false);
  }

  async changePassword(userId, currentPassword, newPassword) {
    return await this.request('/api/Auth/change-password', 'POST', {
      userId,
      currentPassword,
      newPassword
    });
  }

  async changePasswordByUsername(username, currentPassword, newPassword) {
    return await this.request('/api/Auth/change-password-by-username', 'POST', {
      username,
      currentPassword,
      newPassword
    }, false);
  }

  async logout() {
    await this.removeToken();
  }

  // ==================== MEMBERS APIs ====================
  async getSubCompanyId() {
    try {
      const id = await AsyncStorage.getItem('subCompanyId');
      return id ? parseInt(id) : null;
    } catch { return null; }
  }

  async getMembers() {
    const subCompanyId = await this.getSubCompanyId();
    const qs = subCompanyId ? `?subCompanyId=${subCompanyId}` : '';
    return await this.request(`/api/Members${qs}`);
  }

  async getMember(id) {
    const subCompanyId = await this.getSubCompanyId();
    const qs = subCompanyId ? `?subCompanyId=${subCompanyId}` : '';
    return await this.request(`/api/Members/${id}${qs}`);
  }

  async getMemberByUserId(userId) {
    return await this.request(`/api/Members/GetByUserId/${userId}`);
  }

  async searchMembers(query) {
    const subCompanyId = await this.getSubCompanyId();
    const qs = subCompanyId ? `&subCompanyId=${subCompanyId}` : '';
    return await this.request(`/api/Members/search?query=${encodeURIComponent(query)}${qs}`);
  }

  async getMemberStats(memberId) {
    return await this.request(`/api/Inventory/member/${memberId}`);
  }

  async createMember(memberData) {
    return await this.request('/api/Members', 'POST', memberData);
  }

  async createBulkMembers(membersArray) {
    return await this.request('/api/Members/bulk', 'POST', membersArray);
  }

  async updateMember(id, memberData) {
    // Use the new edit endpoint: POST /api/Members/{id}/edit
    return await this.request(`/api/Members/${id}/edit`, 'POST', memberData);
  }

  async deleteMember(id) {
    return await this.request(`/api/Members/${id}`, 'DELETE');
  }

  async uploadMemberPhoto(memberId, photoUri) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `member_${memberId}_photo.jpg`,
      });

      const url = `${this.baseURL}/api/Members/${memberId}/photo`;
      const token = await this.getToken();
      
      const headers = {
        'Content-Type': 'multipart/form-data',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  async getMemberPhoto(memberId) {
    return await this.request(`/api/Members/${memberId}/photo`);
  }

  // Get member photo URL (direct URL for Image component)
  getMemberPhotoUrl(memberId) {
    return `${this.baseURL}/api/Members/${memberId}/photo`;
  }

  // Get all members with full details (business info included)
  async getMembersWithDetails() {
    const subCompanyId = await this.getSubCompanyId();
    const qs = subCompanyId ? `?subCompanyId=${subCompanyId}` : '';
    return await this.request(`/api/Members${qs}`);
  }

  // Get single member with full business details
  async getMemberWithBusinessDetails(id) {
    const subCompanyId = await this.getSubCompanyId();
    const qs = subCompanyId ? `?subCompanyId=${subCompanyId}` : '';
    return await this.request(`/api/Members/${id}${qs}`);
  }

  // ==================== PAYMENTS APIs ====================
  async getPayments(memberId = null) {
    // Use Payments controller endpoint
    const endpoint = memberId ? `/api/Payments?memberId=${memberId}` : '/api/Payments';
    return await this.request(endpoint);
  }

  async getPayment(id) {
    return await this.request(`/api/Payments/${id}`);
  }

  async getMemberPayments(memberId) {
    return await this.request(`/api/Payments/member/${memberId}`);
  }

  async getMemberPaymentSummary(memberId) {
    return await this.request(`/api/Payments/member/${memberId}/summary`);
  }

  async createPayment(paymentData) {
    return await this.request('/api/Payments', 'POST', paymentData);
  }

  async updatePayment(id, paymentData) {
    return await this.request(`/api/Payments/${id}`, 'PUT', paymentData);
  }

  async deletePayment(id) {
    return await this.request(`/api/Payments/${id}`, 'DELETE');
  }

  // ==================== ATTENDANCE APIs ====================
  async getAttendance(date = null) {
    const endpoint = date ? `/api/Attendance?date=${date}` : '/api/Attendance';
    return await this.request(endpoint);
  }

  async getAttendanceWithFilters(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/Attendance${qs}`);
  }

  async getAttendanceReport(fromDate = null, toDate = null) {
    let endpoint = '/api/Attendance/report';
    const params = [];
    
    if (fromDate) params.push(`startDate=${fromDate}`);
    if (toDate) params.push(`endDate=${toDate}`);
    
    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }
    
    return await this.request(endpoint);
  }

  async getAttendanceById(id) {
    return await this.request(`/api/Attendance/${id}`);
  }

  async getMemberAttendance(memberId, startDate = null, endDate = null) {
    let endpoint = `/api/Attendance/member/${memberId}`;
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;
    return await this.request(endpoint);
  }

  async getAttendanceReport(startDate = null, endDate = null, memberId = null) {
    let endpoint = '/api/Attendance/report';
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (params.length > 0) endpoint += `?${params.join('&')}`;
    return await this.request(endpoint);
  }

  async createAttendance(attendanceData) {
    return await this.request('/api/Attendance', 'POST', attendanceData);
  }

  async createBulkAttendance(attendanceArray) {
    return await this.request('/api/Attendance/bulk', 'POST', attendanceArray);
  }

  async updateAttendance(id, attendanceData) {
    return await this.request(`/api/Attendance/${id}`, 'PUT', attendanceData);
  }

  async deleteAttendance(id) {
    return await this.request(`/api/Attendance/${id}`, 'DELETE');
  }

  // ==================== BATCHES APIs ====================
  async getBatches() {
    return await this.request('/api/Batches');
  }

  async getBatch(id) {
    return await this.request(`/api/Batches/${id}`);
  }

  async createBatch(batchData) {
    return await this.request('/api/Batches', 'POST', batchData);
  }

  async updateBatch(id, batchData) {
    return await this.request(`/api/Batches/${id}`, 'PUT', batchData);
  }

  async deleteBatch(id) {
    return await this.request(`/api/Batches/${id}`, 'DELETE');
  }

  // ==================== MAIN COMPANIES APIs ====================
  async getMainCompanies() {
    return await this.request('/api/MainCompanies');
  }

  async getMainCompany(id) {
    return await this.request(`/api/MainCompanies/${id}`);
  }

  async getMainCompanyByCode(code) {
    return await this.request(`/api/MainCompanies/code/${code}`);
  }

  async createMainCompany(companyData) {
    return await this.request('/api/MainCompanies', 'POST', companyData);
  }

  async updateMainCompany(id, companyData) {
    return await this.request(`/api/MainCompanies/${id}`, 'PUT', companyData);
  }

  async deleteMainCompany(id) {
    return await this.request(`/api/MainCompanies/${id}`, 'DELETE');
  }

  // ==================== SUB COMPANIES APIs ====================
  async getSubCompanies() {
    return await this.request('/api/SubCompanies');
  }

  async getSubCompany(id) {
    return await this.request(`/api/SubCompanies/${id}`);
  }

  async getSubCompaniesByMainCompany(mainCompanyId) {
    return await this.request(`/api/SubCompanies/maincompany/${mainCompanyId}`);
  }

  async createSubCompany(subCompanyData) {
    return await this.request('/api/SubCompanies', 'POST', subCompanyData);
  }

  async updateSubCompany(id, subCompanyData) {
    return await this.request(`/api/SubCompanies/${id}`, 'PUT', subCompanyData);
  }

  async deleteSubCompany(id) {
    return await this.request(`/api/SubCompanies/${id}`, 'DELETE');
  }

  // ==================== INVENTORY APIs ====================
  async getInventory() {
    return await this.request('/api/Inventory');
  }

  async getInventoryItem(id) {
    return await this.request(`/api/Inventory/${id}`);
  }

  async getLowStockItems() {
    return await this.request('/api/Inventory/low-stock');
  }

  async createInventoryItem(itemData) {
    return await this.request('/api/Inventory', 'POST', itemData);
  }

  async updateInventoryItem(id, itemData) {
    return await this.request(`/api/Inventory/${id}`, 'PUT', itemData);
  }

  async deleteInventoryItem(id) {
    return await this.request(`/api/Inventory/${id}`, 'DELETE');
  }

  // ==================== NOTICES APIs ====================
  async getNotices() {
    return await this.request('/api/Notices');
  }

  async getNotice(id) {
    return await this.request(`/api/Notices/${id}`);
  }

  async createNotice(noticeData) {
    return await this.request('/api/Notices', 'POST', noticeData);
  }

  async sendNotice(id) {
    return await this.request(`/api/Notices/${id}/send`, 'POST');
  }

  async updateNotice(id, noticeData) {
    return await this.request(`/api/Notices/${id}`, 'PUT', noticeData);
  }

  async deleteNotice(id) {
    return await this.request(`/api/Notices/${id}`, 'DELETE');
  }

  // ==================== MESSAGE NOTIFICATIONS APIs ====================
  async getMessageNotifications() {
    return await this.request('/api/MessageNotifications');
  }

  async getMessageNotification(id) {
    return await this.request(`/api/MessageNotifications/${id}`);
  }

  async createMessageNotification(notificationData) {
    return await this.request('/api/MessageNotifications', 'POST', notificationData);
  }

  async updateMessageNotification(id, notificationData) {
    return await this.request(`/api/MessageNotifications/${id}`, 'PUT', notificationData);
  }

  async deleteMessageNotification(id) {
    return await this.request(`/api/MessageNotifications/${id}`, 'DELETE');
  }

  async getMessageNotificationReport(type = null, period = 'daily', adminMemberId = null) {
    let endpoint = '/api/MessageNotifications/report';
    const params = [];
    
    if (type) params.push(`type=${type}`);
    if (period) params.push(`period=${period}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    
    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }
    
    return await this.request(endpoint);
  }

  // ==================== NOTICES APIs ====================
  async getNotices() {
    return await this.request('/api/Notices');
  }

  async getNotice(id) {
    return await this.request(`/api/Notices/${id}`);
  }

  async getDashboardReminders(memberId) {
    return await this.request(`/api/Notices/dashboard-reminders?memberId=${memberId}`);
  }

  async createNotice(noticeData) {
    return await this.request('/api/Notices', 'POST', noticeData);
  }

  async sendNotice(id) {
    return await this.request(`/api/Notices/${id}/send`, 'POST');
  }

  async updateNotice(id, noticeData) {
    return await this.request(`/api/Notices/${id}`, 'PUT', noticeData);
  }

  async deleteNotice(id) {
    return await this.request(`/api/Notices/${id}`, 'DELETE');
  }

  // ==================== TYFCB APIs ====================
  async getTYFCBs() {
    return await this.request('/api/TYFCB');
  }

  async getTYFCB(id) {
    return await this.request(`/api/TYFCB/${id}`);
  }

  async getTYFCBReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/TYFCB/report${qs}`);
  }

  async getOneToOneMeetingReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/OneToOneMeeting/report${qs}`);
  }

  async getReferralReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/Referrals/report${qs}`);
  }

  async getPaymentReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/Payments/report${qs}`);
  }

  async getAlaigalMeetingReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/MeetingDetails/report${qs}`);
  }

  async getVisitorReport(fromDate = null, toDate = null, period = 'daily', memberId = null, adminMemberId = null) {
    const subCompanyId = await this.getSubCompanyId();
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (period) params.push(`period=${period}`);
    if (memberId) params.push(`memberId=${memberId}`);
    if (adminMemberId) params.push(`adminMemberId=${adminMemberId}`);
    if (subCompanyId) params.push(`subCompanyId=${subCompanyId}`);
    const qs = params.length > 0 ? '?' + params.join('&') : '';
    return await this.request(`/api/Inventory/visitors/report${qs}`);
  }

  async createTYFCB(tyfcbData) {
    return await this.request('/api/TYFCB', 'POST', tyfcbData);
  }

  async updateTYFCB(id, tyfcbData) {
    return await this.request(`/api/TYFCB/${id}`, 'PUT', tyfcbData);
  }

  async updateTYFCBStatus(id, status) {
    return await this.request(`/api/TYFCB/${id}/status`, 'POST', { Status: status });
  }

  async deleteTYFCB(id) {
    return await this.request(`/api/TYFCB/${id}`, 'DELETE');
  }

  // ==================== REFERRALS APIs ====================
  async getReferrals() {
    return await this.request('/api/Referrals');
  }

  async getReferral(id) {
    return await this.request(`/api/Referrals/${id}`);
  }

  async getMemberReferralsGiven(memberId) {
    return await this.request(`/api/Referrals/given/${memberId}`);
  }

  async getMemberReferralsReceived(memberId) {
    return await this.request(`/api/Referrals/received/${memberId}`);
  }

  async createReferral(referralData) {
    return await this.request('/api/Referrals', 'POST', referralData);
  }

  async updateReferral(id, referralData) {
    return await this.request(`/api/Referrals/${id}`, 'PUT', referralData);
  }

  async updateReferralStatus(id, status) {
    return await this.request(`/api/Referrals/${id}/status`, 'POST', { Status: status });
  }

  async deleteReferral(id) {
    return await this.request(`/api/Referrals/${id}`, 'DELETE');
  }

  // ==================== MESSAGES APIs ====================
  async getMessages() {
    return await this.request('/api/Messages');
  }

  async getMessage(id) {
    return await this.request(`/api/Messages/${id}`);
  }

  async getMemberMessages(memberId) {
    return await this.request(`/api/Messages/member/${memberId}`);
  }

  async getUnreadMessages(memberId) {
    return await this.request(`/api/Messages/member/${memberId}/unread`);
  }

  async createMessage(messageData) {
    return await this.request('/api/Messages', 'POST', messageData);
  }

  async markMessageAsRead(id) {
    return await this.request(`/api/Messages/${id}/read`, 'PUT');
  }

  async deleteMessage(id) {
    return await this.request(`/api/Messages/${id}`, 'DELETE');
  }

  // ==================== NOTIFICATIONS APIs ====================
  async getNotifications() {
    return await this.request('/api/Notifications');
  }

  async getNotification(id) {
    return await this.request(`/api/Notifications/${id}`);
  }

  async getMemberNotifications(memberId) {
    return await this.request(`/api/Notifications/member/${memberId}`);
  }

  async getUnreadNotifications(memberId) {
    return await this.request(`/api/Notifications/member/${memberId}/unread`);
  }

  async createNotification(notificationData) {
    return await this.request('/api/Notifications', 'POST', notificationData);
  }

  async markNotificationAsRead(id) {
    return await this.request(`/api/Notifications/${id}/read`, 'PUT');
  }

  async deleteNotification(id) {
    return await this.request(`/api/Notifications/${id}`, 'DELETE');
  }

  // ==================== ADMIN MEETINGS APIs ====================
  async getMeetings() {
    return await this.request('/api/AdminMeetings');
  }

  async getMeeting(id) {
    return await this.request(`/api/AdminMeetings/${id}`);
  }

  async getUpcomingMeetings() {
    return await this.request('/api/AdminMeetings/upcoming');
  }

  // Get all meetings from MeetingDetails table
  async getMeetingDetails() {
    return await this.request('/api/MeetingDetails');
  }

  async createMeeting(meetingData) {
    return await this.request('/api/MeetingDetails', 'POST', meetingData);
  }

  async updateMeeting(id, meetingData) {
    return await this.request(`/api/MeetingDetails/${id}`, 'PUT', meetingData);
  }

  async deleteMeeting(id) {
    return await this.request(`/api/MeetingDetails/${id}`, 'DELETE');
  }

  async getMeetings() {
    return await this.request('/api/MeetingDetails');
  }

  async getMeeting(id) {
    return await this.request(`/api/MeetingDetails/${id}`);
  }

  async notifyMembersAboutMeeting(meetingId) {
    return await this.request(`/api/AdminMeetings/${meetingId}/notify`, 'POST');
  }

  // ==================== MAIN COMPANIES APIs ====================
  async getMainCompanies() {
    return await this.request('/api/MainCompanies');
  }

  async getMainCompany(id) {
    return await this.request(`/api/MainCompanies/${id}`);
  }

  async getMainCompanyByCode(code) {
    return await this.request(`/api/MainCompanies/code/${code}`);
  }

  async createMainCompany(companyData) {
    return await this.request('/api/MainCompanies', 'POST', companyData);
  }

  async updateMainCompany(id, companyData) {
    return await this.request(`/api/MainCompanies/${id}`, 'PUT', companyData);
  }

  async deleteMainCompany(id) {
    return await this.request(`/api/MainCompanies/${id}`, 'DELETE');
  }

  // ==================== SUB COMPANIES APIs ====================
  async getSubCompanies(mainCompanyId = null) {
    const endpoint = mainCompanyId ? `/api/SubCompanies?mainCompanyId=${mainCompanyId}` : '/api/SubCompanies';
    return await this.request(endpoint);
  }

  async getSubCompany(id) {
    return await this.request(`/api/SubCompanies/${id}`);
  }

  async getSubCompaniesByMainCompany(mainCompanyId) {
    return await this.request(`/api/SubCompanies/maincompany/${mainCompanyId}`);
  }

  async getSubCompanyByCode(code, mainCompanyId) {
    return await this.request(`/api/SubCompanies/code/${code}/maincompany/${mainCompanyId}`);
  }

  async createSubCompany(subCompanyData) {
    return await this.request('/api/SubCompanies', 'POST', subCompanyData);
  }

  async updateSubCompany(id, subCompanyData) {
    return await this.request(`/api/SubCompanies/${id}`, 'PUT', subCompanyData);
  }

  async deleteSubCompany(id) {
    return await this.request(`/api/SubCompanies/${id}`, 'DELETE');
  }

  async getSubCompanyStats(id) {
    return await this.request(`/api/SubCompanies/${id}/stats`);
  }

  async getSubCompanyMembers(id) {
    return await this.request(`/api/SubCompanies/${id}/members`);
  }

  // ==================== BIRTHDAY WISH APIs ====================
  async getTodaysBirthdayWish(memberId) {
    try {
      return await this.request(`/api/MessageNotifications/birthday-wish/${memberId}`);
    } catch (error) {
      // If no birthday wish found (404), return null instead of throwing error
      if (error.message && error.message.includes('No birthday wish found')) {
        return null;
      }
      // For other errors, throw them
      throw error;
    }
  }

  async sendBirthdayWish(recipientMemberId, senderMemberId, customMessage = null) {
    return await this.request('/api/MessageNotifications/birthday/wish', 'POST', {
      MemberId: recipientMemberId,
      CreatedBy: senderMemberId,
      CustomMessage: customMessage
    });
  }

  // Daily Thirukkural — same kural for all users all day, changes each day
  async getDailyThirukkural() {
    return await this.request('/api/Thirukkural/daily');
  }
}

export default new ApiService();
