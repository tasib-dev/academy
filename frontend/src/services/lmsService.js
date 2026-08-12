import api from './api';
import authService from './authService';

const lmsService = {
    // Categories
    getCategories: async () => {
        const response = await api.get('/lms/categories/');
        return response.data;
    },

    createCategory: async (categoryData) => {
        const response = await api.post('/lms/categories/', categoryData);
        return response.data;
    },

    updateCategory: async (id, categoryData) => {
        const response = await api.put(`/lms/categories/${id}/`, categoryData);
        return response.data;
    },

    deleteCategory: async (id) => {
        const response = await api.delete(`/lms/categories/${id}/`);
        return response.data;
    },

    // Courses
    getCourses: async () => {
        const response = await api.get('/lms/courses/');
        return response.data;
    },

    getCourse: async (id) => {
        const response = await api.get(`/lms/courses/${id}/`);
        return response.data;
    },

    getLessons: async (courseId) => {
        const response = await api.get(`/lms/lessons/?course=${courseId}`);
        return response.data;
    },

    getLesson: async (lessonId) => {
        const response = await api.get(`/lms/lessons/${lessonId}/`);
        return response.data;
    },

    createCourse: async (courseData) => {
        const response = await api.post('/lms/courses/', courseData);
        return response.data;
    },

    updateCourse: async (id, courseData) => {
        const response = await api.put(`/lms/courses/${id}/`, courseData);
        return response.data;
    },

    deleteCourse: async (id) => {
        const response = await api.delete(`/lms/courses/${id}/`);
        return response.data;
    },

    getMyCourses: async () => {
        const response = await api.get('/lms/courses/my_courses/');
        return response.data;
    },

    // Enrollments
    getEnrollments: async () => {
        const response = await api.get('/lms/enrollments/');
        return response.data;
    },

    enrollInCourse: async (courseId) => {
        const user = authService.getCurrentUser();
        const response = await api.post('/lms/enrollments/', {
            course: courseId,
            student: user?.id,
        });
        return response.data;
    },


    // Payment Requests
    getPaymentRequests: async () => {
        const response = await api.get('/lms/payment-requests/');
        return response.data;
    },

    createPaymentRequest: async (paymentData) => {
        const response = await api.post(
            '/lms/payment-requests/',
            paymentData
        );
        return response.data;
    },

    verifyEnrollmentCode: async (courseId, code) => {
        const response = await api.post(
            '/lms/payment-requests/verify-code/',
            {
                course: courseId,
                code: code,
            }
        );

        return response.data;
    },

    updateEnrollment: async (id, data) => {
        const response = await api.patch(`/lms/enrollments/${id}/`, data);
        return response.data;
    },

    // Dashboard & Reports
    getDashboardStats: async () => {
        const response = await api.get('/lms/dashboard/stats/');
        return response.data;
    },

    getEnrollmentReport: async () => {
        const response = await api.get('/lms/reports/enrollments/');
        return response.data;
    },

    getCourseReport: async () => {
        const response = await api.get('/lms/reports/courses/');
        return response.data;
    },
};

export default lmsService;