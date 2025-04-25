import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Flex, 
  FormControl, 
  FormLabel, 
  Heading, 
  Radio, 
  RadioGroup, 
  Select, 
  Stack, 
  Text, 
  Textarea, 
  useToast
} from '@chakra-ui/react';
import { ttsAPI } from '../services/api';

interface TTSFormProps {
  onSynthesisComplete: (audioUrl: string) => void;
}

const TTSForm: React.FC<TTSFormProps> = ({ onSynthesisComplete }) => {
  const [text, setText] = useState<string>('');
  const [gender, setGender] = useState<string>('女');
  const [voice, setVoice] = useState<string>('chunky');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const MAX_CHARS = 200;

  const handleSynthesis = async () => {
    if (!text) {
      setError('请输入要转换的文本');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ttsAPI.synthesize(text, gender, voice);
      if (response && response.wav_url) {
        onSynthesisComplete(response.wav_url);
        toast({
          title: '音频合成成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('服务器返回的音频 URL 无效');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '音频合成失败');
      toast({
        title: '合成失败',
        description: err instanceof Error ? err.message : '音频合成失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!text) {
      setError('请输入要转换的文本');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await ttsAPI.confirmScript(text, gender, voice);
      if (response && response.mp3_url) {
        onSynthesisComplete(response.mp3_url);
        toast({
          title: '语音合成已确认',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('服务器返回的音频 URL 无效');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音确认失败');
      toast({
        title: '确认失败',
        description: err instanceof Error ? err.message : '语音确认失败',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} mb={6} shadow="md">
      <Heading as="h3" size="md" mb={4}>语音合成</Heading>
      
      <FormControl mb={4} isInvalid={!!error}>
        <FormLabel htmlFor="text">输入文本</FormLabel>
        <Textarea 
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入要转换为语音的文本..."
          resize="vertical"
          rows={4}
          maxLength={MAX_CHARS}
        />
        <Text fontSize="sm" color={text.length > MAX_CHARS * 0.8 ? "orange.500" : "gray.500"} mt={1}>
          {text.length}/{MAX_CHARS} 字符
        </Text>
      </FormControl>

      <FormControl mb={4}>
        <FormLabel>性别</FormLabel>
        <RadioGroup value={gender} onChange={setGender}>
          <Stack direction="row">
            <Radio value="男">男</Radio>
            <Radio value="女">女</Radio>
          </Stack>
        </RadioGroup>
      </FormControl>

      <FormControl mb={4}>
        <FormLabel htmlFor="voice">声音</FormLabel>
        <Select 
          id="voice" 
          value={voice} 
          onChange={(e) => setVoice(e.target.value)}
        >
          <option value="chunky">高级语音(默认)</option>
          <option value="zh-CN-XiaoxiaoNeural">标准语音</option>
        </Select>
      </FormControl>

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      <Flex justifyContent="space-between">
        <Button 
          colorScheme="blue" 
          isLoading={isLoading} 
          onClick={handleSynthesis}
          isDisabled={!text.trim()}
        >
          预览
        </Button>
        <Button 
          colorScheme="green" 
          isLoading={isLoading} 
          onClick={handleConfirm}
          isDisabled={!text.trim()}
        >
          确认合成
        </Button>
      </Flex>
    </Box>
  );
};

export default TTSForm; 