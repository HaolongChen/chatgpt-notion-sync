/**
 * Data Transformer Service
 * 
 * Transforms ChatGPT conversation data into Notion-compatible format.
 * Handles:
 * - Field name conversion (snake_case <-> PascalCase)
 * - Nested object flattening
 * - Data type conversion
 * - Array/object extraction
 * 
 * @module services/dataTransformer
 */

const logger = require('../utils/logger');
const { TransformationError } = require('../utils/errors');
const { truncate } = require('../utils/helpers');

class DataTransformer {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Transform data to Notion properties format
   * @param {Object} data - Source data (can have snake_case or PascalCase)
   * @returns {Object} Notion properties object
   */
  transformToNotionProperties(data) {
    try {
      const properties = {};

      // ConversationID - Title property (required)
      const conversationId = data.conversation_id || data.ConversationID;
      if (conversationId) {
        properties.ConversationID = {
          title: [{ text: { content: String(conversationId) } }],
        };
      }

      // ConversationURL - URL property
      const conversationUrl = data.conversation_url || data.ConversationURL;
      if (conversationUrl) {
        properties.ConversationURL = {
          url: String(conversationUrl),
        };
      }

      // AnalysisDate - Date property
      const analysisDate = data.analysis_date || data.AnalysisDate;
      if (analysisDate) {
        properties.AnalysisDate = {
          date: { start: new Date(analysisDate).toISOString().split('T')[0] },
        };
      }

      // LastSyncDate - Date property (current date)
      properties.LastSyncDate = {
        date: { start: new Date().toISOString().split('T')[0] },
      };

      // ConversationTitle - Rich text
      const conversationTitle = data.conversation_title || data.ConversationTitle;
      if (conversationTitle) {
        properties.ConversationTitle = {
          rich_text: [{ text: { content: truncate(String(conversationTitle), 2000) } }],
        };
      }

      // ConversationSummary - Rich text
      const conversationSummary = data.conversation_summary || data.ConversationSummary;
      if (conversationSummary) {
        properties.ConversationSummary = {
          rich_text: [{ text: { content: truncate(String(conversationSummary), 2000) } }],
        };
      }

      // TechnicalInsights - Multi-select
      const technicalInsights = this.extractTechnicalInsights(data);
      if (technicalInsights.length > 0) {
        properties.TechnicalInsights = {
          multi_select: technicalInsights.slice(0, 100).map(item => ({
            name: truncate(String(item), 100),
          })),
        };
      }

      // ProblemSolvingPatterns - Multi-select
      const problemSolvingPatterns = this.extractProblemSolvingPatterns(data);
      if (problemSolvingPatterns.length > 0) {
        properties.ProblemSolvingPatterns = {
          multi_select: problemSolvingPatterns.slice(0, 100).map(item => ({
            name: truncate(String(item), 100),
          })),
        };
      }

      // CommunicationStyle - Select
      const communicationStyle = this.extractCommunicationStyle(data);
      if (communicationStyle) {
        properties.CommunicationStyle = {
          select: { name: truncate(String(communicationStyle), 100) },
        };
      }

      // ConfidenceScore - Number
      const confidenceScore = data.confidence_score || data.ConfidenceScore;
      if (typeof confidenceScore === 'number') {
        properties.ConfidenceScore = {
          number: Math.round(confidenceScore * 100) / 100,
        };
      }

      // TopicsOfInterest - Multi-select
      const topicsOfInterest = this.extractTopicsOfInterest(data);
      if (topicsOfInterest.length > 0) {
        properties.TopicsOfInterest = {
          multi_select: topicsOfInterest.slice(0, 50).map(item => ({
            name: truncate(String(item), 100),
          })),
        };
      }

      // KeySkills - Multi-select
      const keySkills = this.extractKeySkills(data);
      if (keySkills.length > 0) {
        properties.KeySkills = {
          multi_select: keySkills.slice(0, 50).map(item => ({
            name: truncate(String(item), 100),
          })),
        };
      }

      // ProjectInterests - Multi-select
      const projectInterests = this.extractProjectInterests(data);
      if (projectInterests.length > 0) {
        properties.ProjectInterests = {
          multi_select: projectInterests.slice(0, 50).map(item => ({
            name: truncate(String(item), 100),
          })),
        };
      }

      // GitHubSource - Rich text
      const githubSource = data.github_source || data.GitHubSource;
      if (githubSource) {
        properties.GitHubSource = {
          rich_text: [{ text: { content: truncate(String(githubSource), 2000) } }],
        };
      }

      return properties;
    } catch (error) {
      logger.error('Transformation error', { error: error.message });
      throw new TransformationError(`Failed to transform data: ${error.message}`);
    }
  }

  /**
   * Extract technical insights from nested structure
   */
  extractTechnicalInsights(data) {
    const insights = [];

    // Try snake_case
    const technicalInsights = data.technical_insights || data.TechnicalInsights;

    if (Array.isArray(technicalInsights)) {
      // If it's an array of objects with 'topic' or 'insight' fields
      technicalInsights.forEach(item => {
        if (typeof item === 'string') {
          insights.push(item);
        } else if (typeof item === 'object') {
          if (item.topic) insights.push(item.topic);
          if (item.insight) insights.push(item.insight);
        }
      });
    }

    return insights;
  }

  /**
   * Extract problem solving patterns from nested structure
   */
  extractProblemSolvingPatterns(data) {
    const patterns = [];

    const problemSolving = data.problem_solving_patterns || data.ProblemSolvingPatterns;

    if (Array.isArray(problemSolving)) {
      patterns.push(...problemSolving.filter(p => typeof p === 'string'));
    } else if (typeof problemSolving === 'object' && problemSolving !== null) {
      // Extract from object fields
      if (problemSolving.approach) patterns.push(problemSolving.approach);
      if (problemSolving.thinking_style) patterns.push(problemSolving.thinking_style);
      if (Array.isArray(problemSolving.patterns_identified)) {
        patterns.push(...problemSolving.patterns_identified);
      }
      if (Array.isArray(problemSolving.strengths)) {
        patterns.push(...problemSolving.strengths);
      }
    }

    return patterns;
  }

  /**
   * Extract communication style
   */
  extractCommunicationStyle(data) {
    const commStyle = data.communication_style || data.CommunicationStyle;

    if (typeof commStyle === 'string') {
      return commStyle;
    } else if (typeof commStyle === 'object' && commStyle !== null) {
      // Extract key characteristics
      const parts = [];
      if (commStyle.clarity) parts.push(commStyle.clarity);
      if (commStyle.technical_depth) parts.push(commStyle.technical_depth);
      if (commStyle.engagement_level) parts.push(commStyle.engagement_level);
      return parts.join(', ') || 'Not specified';
    }

    return null;
  }

  /**
   * Extract topics of interest from nested structure
   */
  extractTopicsOfInterest(data) {
    const topics = [];

    const topicsData = data.topics_of_interest || data.TopicsOfInterest;

    if (Array.isArray(topicsData)) {
      topicsData.forEach(item => {
        if (typeof item === 'string') {
          topics.push(item);
        } else if (typeof item === 'object' && item.topic) {
          topics.push(item.topic);
        }
      });
    }

    return topics;
  }

  /**
   * Extract key skills from nested structure
   */
  extractKeySkills(data) {
    const skills = [];

    const skillsData = data.key_skills || data.KeySkills;

    if (Array.isArray(skillsData)) {
      skillsData.forEach(item => {
        if (typeof item === 'string') {
          skills.push(item);
        } else if (typeof item === 'object' && item.skill) {
          // Include proficiency level if available
          const skillName = item.proficiency
            ? `${item.skill} (${item.proficiency})`
            : item.skill;
          skills.push(skillName);
        }
      });
    }

    return skills;
  }

  /**
   * Extract project interests from nested structure
   */
  extractProjectInterests(data) {
    const projects = [];

    const projectsData = data.project_interests || data.ProjectInterests;

    if (Array.isArray(projectsData)) {
      projectsData.forEach(item => {
        if (typeof item === 'string') {
          projects.push(item);
        } else if (typeof item === 'object' && item.project_type) {
          // Include current stage if available
          const projectName = item.current_stage
            ? `${item.project_type} (${item.current_stage})`
            : item.project_type;
          projects.push(projectName);
        }
      });
    }

    return projects;
  }

  /**
   * Get conversation ID from data (handles both formats)
   * @param {Object} data - Source data
   * @returns {string} Conversation ID
   */
  getConversationId(data) {
    return data.conversation_id || data.ConversationID;
  }
}

module.exports = { DataTransformer };
