'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Target, 
  Trophy, 
  Calendar,
  ChevronRight,
  User,
  MapPin,
  Heart,
  MessageCircle,
  BarChart3,
  Users,
  CreditCard,
  Star,
  PlayCircle,
  FileText,
  TrendingUp
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  day: number;
  icon: React.ReactNode;
  completed: boolean;
  category: 'foundation' | 'discovery' | 'organization' | 'analysis' | 'pipeline' | 'community' | 'strategy';
  estimatedTime: string;
  helpUrl?: string;
}

export default function OnboardingPage() {
  const [currentDay, setCurrentDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const router = useRouter();

  const tasks: Task[] = [
    // Day 1: Foundation
    {
      id: 'profile-setup',
      title: 'Fill Out Your Online Profile',
      description: 'Complete your contact information. This information will be used in your emails, marketing letters and LOIs.',
      day: 1,
      icon: <User className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '5 min',
      helpUrl: '/account/profile'
    },
    {
      id: 'search-properties',
      title: 'Search for Properties',
      description: 'Familiarize yourself with the Discover page. Enter a city or a ZIP code in the search bar, then try out some filters to refine your search.',
      day: 1,
      icon: <Target className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '10 min',
      helpUrl: '/discover'
    },
    {
      id: 'view-on-map',
      title: 'Smart Searches',
      description: 'Below the filters are 7 Smart Searches. They will use the same city or ZIP code that you entered earlier. If you\'re curious about the criteria, click on the small edit button on each Smart Search.',
      day: 1,
      icon: <MapPin className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '8 min',
      helpUrl: '/discover'
    },
    {
      id: 'view-property',
      title: 'View the Property',
      description: 'Click on the property image and open up Google Maps to see where the property is located. Click on the blue & white icon. This opens up a Zillow page, which often has more information about the same property, including rental information.',
      day: 1,
      icon: <MapPin className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '8 min',
      helpUrl: '/discover'
    },
    {
      id: 'view-property-details',
      title: 'View Property Details',
      description: 'Click on the View Details link on the property card. Then click on Analyze Investment. The system uses AI to help you determine whether this property is a good fit.',
      day: 1,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '10 min',
      helpUrl: '/discover'
    },
    {
      id: 'complete-lesson-1',
      title: 'Complete this Lesson',
      description: 'Don\'t forget to click on each task and record your progress.',
      day: 1,
      icon: <CheckCircle className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '2 min'
    },

    // Day 2: Discovery
    {
      id: 'setup-buybox',
      title: 'Set up Your Buy Box',
      description: 'Select a market and define your criteria. Each week you will receive machine learning generated property listings that get better and better based on your feedback.',
      day: 2,
      icon: <Target className="h-5 w-5" />,
      completed: false,
      category: 'discovery',
      estimatedTime: '15 min',
      helpUrl: '/discover/buybox'
    },
    {
      id: 'build-pipeline',
      title: 'Build Your Pipeline',
      description: 'Go back to the Discover page and find more properties that meet your criteria. Explore all of the filters to refine your search. Review property details and then save your favorites by clicking the heart on the property card.',
      day: 2,
      icon: <PlayCircle className="h-5 w-5" />,
      completed: false,
      category: 'discovery',
      estimatedTime: '10 min',
      helpUrl: '/discover'
    },
    {
      id: 'analyze-pipeline',
      title: 'Analyze Your Pipeline',
      description: 'Go to the Dashboard and select Pipeline. Drag and drop properties from stage to stage. Check out how your properties align with the investment matrix.',
      day: 2,
      icon: <BarChart3 className="h-5 w-5" />,
      completed: false,
      category: 'discovery',
      estimatedTime: '12 min',
      helpUrl: '/dashboard/pipeline'
    },

    // Day 3: AI & Organization
    {
      id: 'ai-coach',
      title: 'Click on AI Coach',
      description: 'Try out the sample prompts. Then create new prompts based on your areas of interest. Threads allow you to save and organize your MultifamilyOS journey. Be curious!',
      day: 3,
      icon: <MessageCircle className="h-5 w-5" />,
      completed: false,
      category: 'organization',
      estimatedTime: '10 min',
      helpUrl: '/ai-coach'
    },
    {
      id: 'favorite-properties',
      title: 'Find More Favorites',
      description: 'Run more searches, view property details, and check out the neighborhood using Google Street View. Add more properties to your pipeline by clicking on the heart. Don\'t forget about the AI Investment Analyzer! It\'s like having a trusted broker working for you 24x7.',
      day: 3,
      icon: <Heart className="h-5 w-5" />,
      completed: false,
      category: 'organization',
      estimatedTime: '12 min',
      helpUrl: '/discover'
    },

    // Day 4: Engagement & Analysis
    {
      id: 'engage-properties',
      title: 'Let\'s Get Serious',
      description: 'Dig into the details of each property. Run a skiptrace and find out if the owner\'s contact information is available. Add a reminder to the notes section by adding @MM/DD/YY followed by your message.',
      day: 4,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'analysis',
      estimatedTime: '15 min',
      helpUrl: '/engage'
    },
    {
      id: 'generate-documents',
      title: 'Engage with Owners',
      description: 'Select a property and then click on Engagement Center. Create a marketing letter and then an offer. Next, generate an LOI based on the same property. All of these options are available in the Engagement Center.',
      day: 4,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'analysis',
      estimatedTime: '12 min',
      helpUrl: '/engage'
    },

    // Day 5: Pipeline Management
    {
      id: 'pipeline-management',
      title: 'Manage Pipeline Status',
      description: 'By now you should have quite a pipeline of properties. Check their status and drag and drop more mature deals to later stages in the pipeline. Be sure to look at the Deal Matrix below the pipeline. Are you focused on one type of property? Or are you taking a more diversified approach to your portfolio.',
      day: 5,
      icon: <BarChart3 className="h-5 w-5" />,
      completed: false,
      category: 'pipeline',
      estimatedTime: '10 min',
      helpUrl: '/dashboard/pipeline'
    },
    {
      id: 'track-activity',
      title: 'Track Your Activity',
      description: 'Building a multifamily business is a process that requires discipline. This page tracks your key activities, including marketing letters and emails sent, offers generated and LOIs drafted. Even though you\'re in your first week, you should expect to see activity.',
      day: 5,
      icon: <TrendingUp className="h-5 w-5" />,
      completed: false,
      category: 'pipeline',
      estimatedTime: '15 min',
      helpUrl: '/dashboard/metrics'
    },

    // Day 6: Advanced Features
    {
      id: 'save-searches',
      title: 'Save Property Searches',
      description: 'You have a clear sense of the kind of properties you\'re after, including the markets and their attributes. Click on My Searches and save your search criteria so you can easily replicate it across all of your markets.',
      day: 6,
      icon: <Star className="h-5 w-5" />,
      completed: false,
      category: 'community',
      estimatedTime: '8 min',
      helpUrl: '/discover'
    },
    {
      id: 'ai-coach-upload',
      title: 'Upload Report to AI Coach',
      description: 'Click on AI Coach. Take a recent broker property listing and attach it to the chat window. Then start a dialogue with your coach. "Tell me about this property. What are the risks? Does the asking price seem reasonable?" Pretend you\'re speaking with a trusted broker. In reality, you are!',
      day: 6,
      icon: <MessageCircle className="h-5 w-5" />,
      completed: false,
      category: 'community',
      estimatedTime: '10 min',
      helpUrl: '/ai-coach'
    },

    // Day 7: Strategy
    {
      id: 'choose-plan',
      title: 'Take the Next Step in Building Your Multifamily Business',
      description: 'Look how much you\'ve accomplished in just a few hours. Instead of juggling fragmented tools, emails, and spreadsheets, you get one intelligent platform that scouts properties, analyzes deals, generates documents, engages owners, and helps you secure financing. Check out the pricing page and pick the plan that best fits your needs.',
      day: 7,
      icon: <CreditCard className="h-5 w-5" />,
      completed: false,
      category: 'strategy',
      estimatedTime: '5 min',
      helpUrl: '/pricing'
    }
  ];

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
  };

  const getTasksByColumn = (column: 'todo' | 'today' | 'completed') => {
    switch (column) {
      case 'todo':
        return tasks.filter(task => task.day > currentDay && !completedTasks.has(task.id));
      case 'today':
        return tasks.filter(task => task.day === currentDay && !completedTasks.has(task.id));
      case 'completed':
        return tasks.filter(task => completedTasks.has(task.id));
      default:
        return [];
    }
  };

  const getProgressPercentage = () => {
    const totalTasks = tasks.length;
    const completed = completedTasks.size;
    return Math.round((completed / totalTasks) * 100);
  };

  const getDayStatus = (day: number) => {
    const dayTasks = tasks.filter(t => t.day === day);
    const completedDayTasks = dayTasks.filter(t => completedTasks.has(t.id));
    
    if (completedDayTasks.length === dayTasks.length) return 'completed';
    if (day === currentDay) return 'current';
    if (day < currentDay) return 'past';
    return 'future';
  };

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">7-Lesson Quick Start</h1>
            <p className="text-gray-600">Master multifamily investing with our guided onboarding</p>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Your Progress</h3>
                <p className="text-sm text-gray-600">
                  {completedTasks.size} of {tasks.length} tasks completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{getProgressPercentage()}%</div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>

            {/* Lesson Navigation */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const status = getDayStatus(day);
                return (
                  <button
                    key={day}
                    onClick={() => setCurrentDay(day)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : status === 'current'
                        ? 'bg-blue-100 text-blue-800'
                        : status === 'past'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : status === 'current' ? (
                      <PlayCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>Lesson {day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lesson Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson {currentDay} Goal</h3>
          {currentDay === 1 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Foundation</h4>
                <p className="text-gray-600 text-sm">Set up your profile and familiarize yourself with basic system functionality.</p>
              </div>
            </div>
          )}
          {currentDay === 2 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Discovery</h4>
                <p className="text-gray-600 text-sm">Build out your buy box and your pipeline.</p>
              </div>
            </div>
          )}
          {currentDay === 3 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Organization</h4>
                <p className="text-gray-600 text-sm">Master the workflow tools to stay organized and efficient in your deal flow.</p>
              </div>
            </div>
          )}
          {currentDay === 4 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <MessageCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Analysis</h4>
                <p className="text-gray-600 text-sm">Experience our powerful deal evaluation and document generation tools.</p>
              </div>
            </div>
          )}
          {currentDay === 5 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Pipeline</h4>
                <p className="text-gray-600 text-sm">Learn to manage and track your deals through the complete investment pipeline.</p>
              </div>
            </div>
          )}
          {currentDay === 6 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                <Users className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Community</h4>
                <p className="text-gray-600 text-sm">Connect with market insights and leverage our network of real estate professionals.</p>
              </div>
            </div>
          )}
          {currentDay === 7 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Strategy</h4>
                <p className="text-gray-600 text-sm">Complete your onboarding journey and set yourself up for long-term success.</p>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Board */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Lesson Column */}
          <div className="bg-white rounded-lg border border-blue-200 p-4 ring-1 ring-blue-100">
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Current Lesson ({currentDay})</h3>
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                {getTasksByColumn('today').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByColumn('today').map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} router={router} />
              ))}
              {getTasksByColumn('today').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All lesson tasks completed!</p>
                  <p className="text-xs">Move on to the next lesson!</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Completed</h3>
              <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                {getTasksByColumn('completed').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByColumn('completed').map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} router={router} completed />
              ))}
              {getTasksByColumn('completed').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Completed tasks will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}

function TaskCard({ 
  task, 
  onToggle, 
  router,
  completed = false 
}: { 
  task: Task; 
  onToggle: (id: string) => void;
  router: any;
  completed?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
      completed 
        ? 'bg-green-50 border-green-200' 
        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start space-x-3">
        <button
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex-shrink-0 ${
            completed ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {completed ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div className="text-gray-500">
              {task.icon}
            </div>
            <h4 className={`font-medium text-sm ${
              completed ? 'text-green-800 line-through' : 'text-gray-900'
            }`}>
              {task.title}
            </h4>
          </div>
          
          <p className={`text-xs mb-2 ${
            completed ? 'text-green-700' : 'text-gray-600'
          }`}>
            {task.description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              completed 
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {task.estimatedTime}
            </span>
            
            {task.helpUrl && !completed && (
              <button 
                onClick={() => router.push(task.helpUrl)}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center space-x-1"
              >
                <span>Start</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}