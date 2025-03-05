import React from 'react';
import AudioPlayer from './AudioPlayer';

interface SampleItem {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  accent: string;
  voiceStyle: string;
}

const SAMPLE_DATA: SampleItem[] = [
  {
    id: 'sample1',
    title: '企业宣传片配音',
    description: '专业商务风格，适合企业形象宣传片和产品介绍视频',
    audioUrl: '/static/samples/sample1.mp3',
    accent: '美式口音',
    voiceStyle: '专业'
  },
  {
    id: 'sample2',
    title: '教育培训课程',
    description: '清晰自然的语调，适合在线课程和教学视频',
    audioUrl: '/static/samples/sample2.mp3',
    accent: '英式口音',
    voiceStyle: '教学'
  },
  {
    id: 'sample3',
    title: '科技产品介绍',
    description: '现代感十足，适合高科技产品和服务的宣传',
    audioUrl: '/static/samples/sample3.mp3',
    accent: '美式口音',
    voiceStyle: '现代'
  },
  {
    id: 'sample4',
    title: '节日活动推广',
    description: '热情活泼的风格，适合节日营销和促销活动',
    audioUrl: '/static/samples/sample4.mp3',
    accent: '美式口音',
    voiceStyle: '活力'
  }
];

const SamplePreviews: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">配音示例库</h2>
        <p className="text-gray-600 mt-2">浏览我们的配音示例，体验不同风格和口音的配音效果</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLE_DATA.map(sample => (
          <div key={sample.id} className="card p-4">
            <h3 className="text-lg font-medium text-gray-800">{sample.title}</h3>
            <p className="text-gray-600 text-sm mt-1 mb-4">{sample.description}</p>
            
            <AudioPlayer 
              audioUrl={sample.audioUrl}
              accent={sample.accent}
              voiceStyle={sample.voiceStyle}
            />
          </div>
        ))}
      </div>
      
      <div className="p-6 bg-primary-50 rounded-lg text-center">
        <h3 className="text-xl font-semibold text-primary-800">想要定制您自己的配音？</h3>
        <p className="text-primary-700 mt-2 mb-4">通过我们的AI助手，您可以轻松创建专属于您的英文配音</p>
        <a href="/" className="btn btn-primary">开始创建</a>
      </div>
    </div>
  );
};

export default SamplePreviews; 