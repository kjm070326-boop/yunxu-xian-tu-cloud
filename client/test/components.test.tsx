import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChapterPanel, GoalBar, Typewriter, ChatPage } from '../src/components';

describe('client foundation components', () => {
  it('typewriter can reveal the whole passage immediately', () => {
    render(<Typewriter text="一段很长的修行故事" duration={99999} />);
    expect(screen.getByText('立即显示全文')).toBeInTheDocument();
    fireEvent.click(screen.getByText('立即显示全文'));
    expect(screen.getByText('一段很长的修行故事')).toBeInTheDocument();
  });
  it('chapter panel gates advance until all requirements are met', () => {
    const onAdvance = vi.fn();
    render(<ChapterPanel panel={{ chapter: 2, progress: 2, required: 3, gates: [{ label: '炼气三层', met: false, missing: '还差 1 层' }] }} onAdvance={onAdvance} />);
    expect(screen.getByRole('button', { name: '完成历练后解锁' })).toBeDisabled();
    expect(screen.getByText('还差 1 层')).toBeInTheDocument();
  });
  it('goal bar exposes its progress and target', () => { render(<GoalBar current={25} target={100} />); expect(screen.getByText('25/100')).toBeInTheDocument(); });
  it('candidate lightbulb replies can be opened and sent', async () => {
    const onSuggest = vi.fn(); const onSend = vi.fn();
    render(<ChatPage onSend={onSend} onSuggest={onSuggest} replyOptions={['谨慎回答', '坦诚相告']} draft="" setDraft={() => {}} />);
    expect(screen.getByText('谨慎回答')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: '候选回复' })); expect(onSuggest).toHaveBeenCalled(); fireEvent.click(screen.getByText('坦诚相告')); expect(onSend).toHaveBeenCalledWith('坦诚相告');
  });
});
