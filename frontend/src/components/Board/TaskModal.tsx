import React, { useState, useEffect } from 'react';
import githubApi from '../../services/githubApi';
import api from '../../services/api';
import { Task, GithubRepo } from '../../types';

interface TaskModalProps {
  task: Task;
  boardId: string;
  cardId: string;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, boardId, cardId, onClose, onTaskUpdated }) => {
  const [description, setDescription] = useState(task.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [repoDetails, setRepoDetails] = useState<any>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [attachments, setAttachments] = useState<any[]>(task.githubAttachments || []);

  useEffect(() => {
    setDescription(task.description || '');
    setAttachments(task.githubAttachments || []);
  }, [task]);

  const handleUpdateDescription = async () => {
    try {
      const res = await api.put<Task>(`/boards/${boardId}/cards/${cardId}/tasks/${task.id}`, {
        description
      });
      onTaskUpdated(res.data);
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Failed to update description', err);
    }
  };

  const fetchRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await githubApi.getRepos();
      setRepos(res.data);
    } catch (err) {
      console.error('Failed to fetch repos', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRepoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoFullName = e.target.value;
    if (!repoFullName) {
      setSelectedRepo(null);
      setRepoDetails(null);
      return;
    }

    const repo = repos.find(r => r.full_name === repoFullName);
    if (!repo) return;
    
    setSelectedRepo(repo);
    
    setIsLoadingDetails(true);
    try {
      const res = await githubApi.getRepoDetails(repo.owner.login, repo.name);
      setRepoDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch repo details', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleAttach = async (type: string, entity: any) => {
    try {
      const res = await githubApi.attachEntity(boardId, cardId, task.id, type, entity);
      setAttachments(res.data.githubAttachments);
      onTaskUpdated({ ...task, githubAttachments: res.data.githubAttachments });
    } catch (err) {
      console.error('Failed to attach', err);
    }
  };

  const handleDetach = async (entityId: string) => {
    try {
      const res = await githubApi.detachEntity(boardId, cardId, task.id, entityId);
      setAttachments(res.data.githubAttachments);
      onTaskUpdated({ ...task, githubAttachments: res.data.githubAttachments });
    } catch (err) {
      console.error('Failed to detach', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{task.title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
            {isEditingDescription ? (
              <div>
                <textarea
                  className="w-full p-3 border border-blue-400 rounded focus:outline-none"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleUpdateDescription} className="bg-blue-600 text-white text-sm font-bold py-1 px-4 rounded">Save</button>
                  <button onClick={() => setIsEditingDescription(false)} className="text-gray-500 text-sm hover:text-gray-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingDescription(true)}
                className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer min-h-[100px]"
              >
                {description || <span className="text-gray-400 italic">Add a more detailed description...</span>}
              </div>
            )}
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">GitHub Attachments</h3>
            
            {attachments.length > 0 && (
              <div className="space-y-2 mb-4">
                {attachments.map((att: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 border border-blue-100 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">{att.type}</span>
                      <a href={att.html_url || att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                        {att.name || att.title || att.ref || att.full_name}
                      </a>
                    </div>
                    <button onClick={() => handleDetach(att.id || att.url)} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              {!repos.length ? (
                <button 
                  onClick={fetchRepos}
                  className="w-full py-2 bg-gray-800 text-white rounded font-bold text-sm flex items-center justify-center gap-2"
                  disabled={isLoadingRepos}
                >
                  {isLoadingRepos ? 'Loading Repos...' : 'Attach GitHub Entity'}
                </button>
              ) : (
                <div className="space-y-3">
                  <select 
                    onChange={handleRepoChange}
                    className="w-full p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a repository...</option>
                    {repos.map(repo => (
                      <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
                    ))}
                  </select>

                  {isLoadingDetails && <div className="text-center py-2 text-sm text-gray-500">Loading repo details...</div>}

                  {repoDetails && (
                    <div className="grid grid-cols-1 gap-4 mt-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Branches</h4>
                        <div className="flex flex-wrap gap-2">
                          {repoDetails.branches.map((branch: any) => (
                            <button 
                              key={branch.name}
                              onClick={() => selectedRepo && handleAttach('branch', { name: branch.name, url: `${selectedRepo.html_url}/tree/${branch.name}`, ref: branch.name })}
                              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                            >
                              {branch.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Pull Requests</h4>
                        <div className="space-y-1">
                          {repoDetails.pulls.map((pr: any) => (
                            <button 
                              key={pr.id}
                              onClick={() => handleAttach('pull', pr)}
                              className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded truncate"
                            >
                              #{pr.number} {pr.title}
                            </button>
                          ))}
                          {!repoDetails.pulls.length && <div className="text-xs text-gray-400 italic">No open PRs</div>}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Issues</h4>
                        <div className="space-y-1">
                          {repoDetails.issues.map((issue: any) => (
                            <button 
                              key={issue.id}
                              onClick={() => handleAttach('issue', issue)}
                              className="block w-full text-left text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded truncate"
                            >
                              #{issue.number} {issue.title}
                            </button>
                          ))}
                          {!repoDetails.issues.length && <div className="text-xs text-gray-400 italic">No open issues</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
