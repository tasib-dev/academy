import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import lmsService from '../services/lmsService';
console.log('LMS SERVICE:', lmsService);
console.log(
    'CREATE PAYMENT REQUEST:',
    lmsService.createPaymentRequest
);
import { useAuth } from '../context/AuthContext';

const CourseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [error, setError] = useState('');
    const [enrollStatus, setEnrollStatus] = useState('');
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollStep, setEnrollStep] = useState('choice');
    const [showPaymentInfo, setShowPaymentInfo] = useState(false);
    const [copiedNumber, setCopiedNumber] = useState('');
    const [paymentData, setPaymentData] = useState({
        name: '',
        google_account_email: '',
        bkash_number: '',
        transaction_id: '',
        payment_screenshot: null,
    });

    const [enrollmentCode, setEnrollmentCode] = useState('');
    const [codeLoading, setCodeLoading] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    

    useEffect(() => {
        fetchCourseDataset();
    }, [id]);

    const fetchCourseDataset = async () => {
        try {
            const data = await lmsService.getCourse(id);

            setCourse(data);

            // Only load lessons if the student is enrolled
            if (data.is_enrolled) {
                const lessonData = await lmsService.getLessons(id);
                setLessons(lessonData);
                setEnrollStatus('success');
            } else {
                setLessons([]);
            }

        } catch (err) {
            console.error(err);
            setError('Failed to load course details');
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setEnrollStep('choice');
        setShowEnrollModal(true);
    };



    const handleCopyNumber = async (number, name) => {
        try {
            await navigator.clipboard.writeText(number);

            setCopiedNumber(name);

            setTimeout(() => {
                setCopiedNumber('');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy number:', err);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        if (paymentSubmitting) return;

        setPaymentSubmitting(true);

        try {
            const formData = new FormData();

            formData.append('course', id);
            formData.append('name', paymentData.name);
            formData.append(
                'google_account_email',
                paymentData.google_account_email
            );
            formData.append('bkash_number', paymentData.bkash_number);
            formData.append('transaction_id', paymentData.transaction_id);

            if (paymentData.payment_screenshot) {
                formData.append(
                    'payment_screenshot',
                    paymentData.payment_screenshot
                );
            }

            await lmsService.createPaymentRequest(formData);

            alert(
                'Payment information submitted successfully! Please wait for payment approval. You will receive your enrollment code by email after approval.'
            );

            setShowEnrollModal(false);

        } catch (err) {
            console.error('Payment submission error:', err);

            if (err.response?.status === 400) {
                const backendError = err.response?.data;

                const message =
                    backendError?.non_field_errors?.[0] ||
                    backendError?.detail ||
                    'You already have a pending payment request for this course.';

                alert(`⚠️ ${message}`);
            } else {
                alert(
                    '❌ Failed to submit payment information. Please try again.'
                );
            }
        }
        finally {
            setPaymentSubmitting(false);
        }
    };


    const handleVerifyCode = async () => {
        if (!enrollmentCode.trim()) {
            alert('Please enter your enrollment code.');
            return;
        }

        setCodeLoading(true);

        try {
            const response = await lmsService.verifyEnrollmentCode(
                id,
                enrollmentCode.trim()
            );

            alert(
                response.message ||
                '✅ Code verified successfully! You are now enrolled.'
            );

            setEnrollStatus('success');
            setShowEnrollModal(false);
            setEnrollStep('choice');
            setEnrollmentCode('');

            // Refresh course data
            await fetchCourseDataset();

        } catch (err) {
            console.error('Code verification error:', err);

            const message =
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Invalid or already used enrollment code.';

            alert(`❌ ${message}`);

        } finally {
            setCodeLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this course?')) {
            try {
                await lmsService.deleteCourse(id);
                navigate('/courses');
            } catch (err) {
                alert('Failed to delete course');
            }
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error || !course) return (
        <div className="container mx-auto px-4 py-8 text-center text-red-600">
            {error || 'Course not found'}
        </div>
    );

    const isInstructor = user?.role === 'instructor' && user?.id === course.instructor;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-blue-600 text-white p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="inline-block px-3 py-1 bg-blue-700 rounded-full text-sm font-semibold mb-4">
                                {course.category_name || 'General'}
                            </span>
                            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
                            <p className="text-blue-100 text-lg">{course.description}</p>
                        </div>
                        <div className="bg-white text-blue-900 px-6 py-4 rounded-lg font-bold text-2xl shadow-lg">
                            ${course.price}
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold mb-4">About This Course</h2>
                            <p className="text-gray-600 leading-relaxed">
                                {course.description}
                                {/* In a real app, this might be a longer rich text field */}
                            </p>
                        </div>

                        <div>
    <h2 className="text-2xl font-bold mb-4">
        Course Content
    </h2>

    {!course.is_enrolled ? (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
            <div className="text-4xl mb-3">
                🔒
            </div>

            <h3 className="text-lg font-bold text-gray-800 mb-2">
                Course Content Locked
            </h3>

            <p className="text-gray-500">
                Enroll in this course to access the lessons.
            </p>
        </div>
    ) : lessons.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p className="text-gray-500 italic text-center">
                No lessons available yet.
            </p>
        </div>
    ) : (
        <div className="space-y-3">
            {lessons.map((lesson) => (
                <Link
                    key={lesson.id}
                    to={`/lessons/${lesson.id}`}
                    className="block bg-gray-50 rounded-lg p-5 border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {lesson.order}
                        </div>

                        <div>
                            <h3 className="font-bold text-lg">
                                {lesson.title}
                            </h3>

                            {lesson.description && (
                                <p className="text-gray-600 mt-1">
                                    {lesson.description}
                                </p>
                            )}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )}
</div>

                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <h3 className="font-bold text-lg mb-4">Course Features</h3>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <span className="mr-3">⏱️</span>
                                    {course.duration} Hours Duration
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-3">📊</span>
                                    {course.difficulty} Level
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-3">👨‍🏫</span>
                                    Instructor: {course.instructor_name}
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-3">👥</span>
                                    {course.enrollment_count} Enrolled
                                </li>
                            </ul>
                        </div>

                        {/* Actions */}
                        {isInstructor ? (
                            <div className="space-y-3">
                                <Link
                                    to={`/edit-course/${course.id}`}
                                    className="block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                                >
                                    Edit Course
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    className="block w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                                >
                                    Delete Course
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {enrollStatus === 'success' ? (
                                    <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center font-bold">
                                        ✅ You are enrolled in this course
                                    </div>
                                ) : enrollStatus === 'error' ? (
                                    <div className="bg-red-100 text-red-800 p-4 rounded-lg text-center">
                                        Failed to enroll. You might already be enrolled.
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleEnroll}
                                        disabled={enrollLoading}
                                        className={`block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-md transition transform hover:-translate-y-1 ${enrollLoading ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {enrollLoading ? 'Processing...' : 'Enroll Now'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                                </div>
            </div>

            {/* Enrollment Modal */}
            {showEnrollModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">

                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

                        {/* Modal Header */}
                        <div className="border-b px-6 py-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Enroll in Course
                                </h2>

                                <button
                                    onClick={() => setShowEnrollModal(false)}
                                    className="text-2xl text-gray-400 hover:text-gray-700"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Choice */}
                        {enrollStep === 'choice' && (
                            <div className="p-6">
                                <p className="mb-6 text-center text-lg text-gray-700">
                                    Have you already paid for this course?
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setEnrollStep('code')}
                                        className="w-full rounded-lg bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
                                    >
                                        ✅ Yes, I have paid
                                    </button>

                                    <button
                                        onClick={() => setEnrollStep('payment')}
                                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
                                    >
                                        💳 No, I haven't paid yet
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Code Step - Temporary */}
                        {enrollStep === 'code' && (
                            <div className="p-6">
                                <h3 className="mb-2 text-xl font-bold text-gray-800">
                                    Enter your enrollment code
                                </h3>

                                <p className="mb-5 text-sm text-gray-500">
                                    Enter the unique code you received by email
                                    after your payment was approved.
                                </p>

                                <input
                                    type="text"
                                    placeholder="Enter your 12-character code"
                                    value={enrollmentCode}
                                    onChange={(e) => setEnrollmentCode(e.target.value)}
                                    maxLength={12}
                                    className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                                />

                                <button
                                    onClick={handleVerifyCode}
                                    disabled={codeLoading}
                                    className="w-full rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {codeLoading ? 'Verifying...' : 'Verify & Enroll'}
                                </button>

                                <button
                                    onClick={() => setEnrollStep('choice')}
                                    className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
                                >
                                    ← Back
                                </button>
                            </div>
                        )}

                        {/* Payment Step - Temporary */}
                        {enrollStep === 'payment' && (
    <div className="p-6">
        <h3 className="mb-2 text-xl font-bold text-gray-800">
            Payment Information
        </h3>

        <button
    type="button"
    onClick={() => setShowPaymentInfo(true)}
    className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-50 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-100"
>
    💳 See where to send money
</button>

        <p className="mb-5 text-sm text-gray-600">
            Please complete your payment and submit the information below.
            After we verify your payment, you will receive your enrollment
            code by email.
        </p>

        <div className="space-y-4">

            {/* Name */}
            <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Full Name
                </label>

                <input
    type="text"
    placeholder="Enter your full name"
    value={paymentData.name}
    onChange={(e) =>
        setPaymentData({
            ...paymentData,
            name: e.target.value,
        })
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
/>
            </div>

            {/* Google Account Email */}
            <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Google Account Email
                </label>

                <input
    type="email"
    placeholder="example@gmail.com"
    value={paymentData.google_account_email}
    onChange={(e) =>
        setPaymentData({
            ...paymentData,
            google_account_email: e.target.value,
        })
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
/>

                <p className="mt-2 text-xs text-gray-500">
                    ⚠️ Please enter the Google account email you will use to
                    watch the course lessons in Chrome. This must be the
                    account you use for your course access.
                </p>
            </div>

            {/* bKash Number */}
            <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    bKash Number
                </label>

                <input
    type="tel"
    placeholder="01XXXXXXXXX"
    value={paymentData.bkash_number}
    onChange={(e) =>
        setPaymentData({
            ...paymentData,
            bkash_number: e.target.value,
        })
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
/>

                <p className="mt-2 text-xs text-gray-500">
                    Enter the bKash number you used to make the payment.
                </p>
            </div>

            {/* Transaction ID */}
            <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    Transaction ID
                </label>

                <input
    type="text"
    placeholder="Enter your bKash transaction ID"
    value={paymentData.transaction_id}
    onChange={(e) =>
        setPaymentData({
            ...paymentData,
            transaction_id: e.target.value,
        })
    }
    className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-blue-500"
/>
            </div>

            {/* Submit */}
            <button
    type="button"
    onClick={handlePaymentSubmit}
    disabled={paymentSubmitting}
    className={`w-full rounded-lg px-5 py-3 font-bold text-white transition ${
        paymentSubmitting
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
    }`}
>
    {paymentSubmitting ? (
        <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Submitting...
        </span>
    ) : (
        'Submit Payment Information'
    )}
</button>

            {/* Back */}
            <button
                type="button"
                onClick={() => setEnrollStep('choice')}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
                ← Back
            </button>

            {/* Payment Information Popup */}
{showPaymentInfo && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">
                        Payment Information
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Send the course fee to any one of these accounts.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowPaymentInfo(false)}
                    className="text-2xl text-gray-400 hover:text-gray-700"
                >
                    ×
                </button>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4 p-6">

                {/* bKash */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 font-bold text-gray-800">
                        🟣 bKash
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg bg-white px-4 py-3 font-mono text-lg font-semibold text-gray-700">
                            01XXXXXXXXX
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleCopyNumber('01XXXXXXXXX', 'bkash')
                            }
                            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                            {copiedNumber === 'bkash'
                                ? '✓ Copied'
                                : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Nagad */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 font-bold text-gray-800">
                        🟠 Nagad
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg bg-white px-4 py-3 font-mono text-lg font-semibold text-gray-700">
                            01XXXXXXXXX
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleCopyNumber('01XXXXXXXXX', 'nagad')
                            }
                            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                            {copiedNumber === 'nagad'
                                ? '✓ Copied'
                                : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Rocket */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 font-bold text-gray-800">
                        🔵 Rocket
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg bg-white px-4 py-3 font-mono text-lg font-semibold text-gray-700">
                            01XXXXXXXXX
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                handleCopyNumber('01XXXXXXXXX', 'rocket')
                            }
                            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                        >
                            {copiedNumber === 'rocket'
                                ? '✓ Copied'
                                : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Notice */}
                <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    ⚠️ After sending the payment, return to the payment form
                    and enter your transaction ID.
                </div>

                {/* Close */}
                <button
                    type="button"
                    onClick={() => setShowPaymentInfo(false)}
                    className="w-full rounded-lg bg-gray-200 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-300"
                >
                    Close
                </button>

            </div>
        </div>
    </div>
)}

        </div>
    </div>
)}

                    </div>
                </div>
            )}
        </div>
        </div>
    );
};


export default CourseDetails;
