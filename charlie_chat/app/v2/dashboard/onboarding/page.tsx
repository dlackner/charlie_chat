'use client';

import { useState } from 'react';
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

  const tasks: Task[] = [
    // Day 1: Foundation
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description: 'Add your contact info, business details, and upload a logo',
      day: 1,
      icon: <User className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '5 min',
      helpUrl: '/account/profile'
    },
    {
      id: 'first-buybox',
      title: 'Create Your First Buy Box Market',
      description: 'Define your investment criteria for your target market',
      day: 1,
      icon: <MapPin className="h-5 w-5" />,
      completed: false,
      category: 'foundation',
      estimatedTime: '10 min',
      helpUrl: '/discover/buybox'
    },

    // Day 2: Discovery
    {
      id: 'review-recommendations',
      title: 'Review Your First Recommendations',
      description: 'Check out AI-curated properties matched to your criteria',
      day: 2,
      icon: <Target className="h-5 w-5" />,
      completed: false,
      category: 'discovery',
      estimatedTime: '15 min'
    },
    {
      id: 'favorite-properties',
      title: 'Mark 3 Properties as Favorites',
      description: 'Save interesting properties to your favorites list',
      day: 2,
      icon: <Heart className="h-5 w-5" />,
      completed: false,
      category: 'discovery',
      estimatedTime: '10 min'
    },

    // Day 3: Organization
    {
      id: 'save-search',
      title: 'Save a Custom Property Search',
      description: 'Create a reusable search with your specific filters',
      day: 3,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'organization',
      estimatedTime: '8 min'
    },
    {
      id: 'add-notes',
      title: 'Add Notes to 2 Properties',
      description: 'Practice organizing your thoughts on potential deals',
      day: 3,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'organization',
      estimatedTime: '5 min'
    },
    {
      id: 'set-reminder',
      title: 'Set Up a Property Reminder',
      description: 'Use @MM/DD/YY format to create a follow-up reminder',
      day: 3,
      icon: <Calendar className="h-5 w-5" />,
      completed: false,
      category: 'organization',
      estimatedTime: '3 min'
    },

    // Day 4: Analysis
    {
      id: 'ai-analysis',
      title: 'Use AI Chat for Property Analysis',
      description: 'Ask Charlie about a property\'s investment potential',
      day: 4,
      icon: <MessageCircle className="h-5 w-5" />,
      completed: false,
      category: 'analysis',
      estimatedTime: '10 min'
    },
    {
      id: 'generate-loi',
      title: 'Generate Your First LOI',
      description: 'Create a Letter of Intent for a property you like',
      day: 4,
      icon: <FileText className="h-5 w-5" />,
      completed: false,
      category: 'analysis',
      estimatedTime: '15 min'
    },

    // Day 5: Pipeline
    {
      id: 'pipeline-management',
      title: 'Move Properties Through Pipeline Stages',
      description: 'Practice organizing deals by their current status',
      day: 5,
      icon: <BarChart3 className="h-5 w-5" />,
      completed: false,
      category: 'pipeline',
      estimatedTime: '12 min'
    },
    {
      id: 'market-report',
      title: 'Generate a Market Report',
      description: 'Create insights about your target market',
      day: 5,
      icon: <TrendingUp className="h-5 w-5" />,
      completed: false,
      category: 'pipeline',
      estimatedTime: '8 min'
    },

    // Day 6: Community
    {
      id: 'explore-community',
      title: 'Explore Community Insights',
      description: 'Check out market trends and community data',
      day: 6,
      icon: <Users className="h-5 w-5" />,
      completed: false,
      category: 'community',
      estimatedTime: '10 min'
    },
    {
      id: 'find-lenders',
      title: 'Find Mortgage Lenders in Your Area',
      description: 'Browse our database of multifamily lenders',
      day: 6,
      icon: <CreditCard className="h-5 w-5" />,
      completed: false,
      category: 'community',
      estimatedTime: '15 min'
    },

    // Day 7: Strategy
    {
      id: 'review-progress',
      title: 'Review Your Week\'s Progress',
      description: 'See how much you\'ve learned and accomplished',
      day: 7,
      icon: <Trophy className="h-5 w-5" />,
      completed: false,
      category: 'strategy',
      estimatedTime: '10 min'
    },
    {
      id: 'setup-weekly',
      title: 'Set Up Weekly Recommendations',
      description: 'Enable automated property recommendations',
      day: 7,
      icon: <Target className="h-5 w-5" />,
      completed: false,
      category: 'strategy',
      estimatedTime: '5 min'
    },
    {
      id: 'choose-plan',
      title: 'Choose Your Subscription Plan',
      description: 'Continue your investment journey with the right plan',
      day: 7,
      icon: <Star className="h-5 w-5" />,
      completed: false,
      category: 'strategy',
      estimatedTime: '5 min'
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Trophy className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">7-Day Quick Start</h1>
              <p className="text-gray-600">Master multifamily investing with our guided onboarding</p>
            </div>
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

            {/* Day Navigation */}
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
                    <span>Day {day}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">To Do</h3>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {getTasksByColumn('todo').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByColumn('todo').map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {getTasksByColumn('todo').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All upcoming tasks will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Today Column */}
          <div className="bg-white rounded-lg border border-blue-200 p-4 ring-1 ring-blue-100">
            <div className="flex items-center space-x-2 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Today (Day {currentDay})</h3>
              <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                {getTasksByColumn('today').length}
              </span>
            </div>
            <div className="space-y-3">
              {getTasksByColumn('today').map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {getTasksByColumn('today').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All today's tasks completed!</p>
                  <p className="text-xs">Come back tomorrow for more</p>
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
                <TaskCard key={task.id} task={task} onToggle={toggleTask} completed />
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

        {/* Day Summary */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Day {currentDay} Goal</h3>
          {currentDay === 1 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Foundation</h4>
                <p className="text-gray-600 text-sm">Get your investment criteria defined and your profile set up for success.</p>
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
                <p className="text-gray-600 text-sm">See the AI in action with your first personalized property recommendations.</p>
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
                <p className="text-gray-600 text-sm">Organize your deal flow and generate insights about your target markets.</p>
              </div>
            </div>
          )}
          {currentDay === 6 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-cyan-50 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Community</h4>
                <p className="text-gray-600 text-sm">Connect with resources and explore community insights to accelerate your success.</p>
              </div>
            </div>
          )}
          {currentDay === 7 && (
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Strategy</h4>
                <p className="text-gray-600 text-sm">Commit to your investment journey by choosing the right plan for your goals.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  onToggle, 
  completed = false 
}: { 
  task: Task; 
  onToggle: (id: string) => void;
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
              <button className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center space-x-1">
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