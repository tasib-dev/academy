import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import lmsService from '../services/lmsService';

const LessonDetails = () => {
    const { id } = useParams();

    const [lesson, setLesson] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const getEmbedUrl = (url) => {
    if (!url) return null;

    try {
        const parsedUrl = new URL(url);

        // Normal YouTube URL
        // https://www.youtube.com/watch?v=VIDEO_ID
        if (parsedUrl.hostname.includes('youtube.com')) {
            const videoId = parsedUrl.searchParams.get('v');

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }

        // Short YouTube URL
        // https://youtu.be/VIDEO_ID
        if (parsedUrl.hostname === 'youtu.be') {
            const videoId = parsedUrl.pathname.substring(1);

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        }

        // Already an embed URL or another URL
        return url;

    } catch (error) {
        console.error('Invalid video URL:', error);
        return null;
    }
};

useEffect(() => {
        fetchLesson();
    }, [id]);

    const fetchLesson = async () => {
    try {
        const data = await lmsService.getLesson(id);

        console.log('LESSON DATA:', data);

        setLesson(data);
    } catch (err) {
        console.error('LESSON ERROR:', err);
        console.error('STATUS:', err.response?.status);
        console.error('DATA:', err.response?.data);
        console.error('URL:', err.config?.url);

        setError(
            err.response?.data?.detail ||
            err.message ||
            'Failed to load lesson'
        );
    } finally {
        setLoading(false);
    }
};

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !lesson) {
        return (
            <div className="container mx-auto px-4 py-8 text-center text-red-600">
                {error || 'Lesson not found'}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">

                {/* Back to course */}
                <Link
                    to={`/courses/${lesson.course}`}
                    className="inline-block mb-6 text-blue-600 hover:text-blue-800"
                >
                    ← Back to Course
                </Link>

                {/* Lesson title */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">

                    <div className="bg-blue-600 text-white p-8">
                        <p className="text-blue-100 mb-2">
                            Lesson {lesson.order}
                        </p>

                        <h1 className="text-3xl font-bold">
                            {lesson.title}
                        </h1>
                    </div>

                    <div className="p-8">

                        {/* Video */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4">
                                Lesson Video
                            </h2>

                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {lesson.video_url ? (
                                    <iframe
                                        className="w-full h-full"
                                        src={getEmbedUrl(lesson.video_url)}
                                        title={lesson.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white">
                                        Video not available yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-2xl font-bold mb-4">
                                About This Lesson
                            </h2>

                            <p className="text-gray-600 leading-relaxed">
                                {lesson.description}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonDetails;