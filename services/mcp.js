const axios = require('axios');

/**
 * Use an MCP tool
 * @param {string} serverName - Name of the MCP server
 * @param {string} toolName - Name of the tool to use
 * @param {object} args - Arguments to pass to the tool
 * @returns {Promise<any>} Tool response
 */
async function use_mcp_tool(serverName, toolName, args) {
    try {
        const response = await axios.post('http://localhost:3001/mcp/tool', {
            server: serverName,
            tool: toolName,
            arguments: args
        });
        return response.data;
    } catch (error) {
        console.error('MCP tool error:', error.response?.data || error.message);
        throw new Error('Failed to use MCP tool');
    }
}

/**
 * Access an MCP resource
 * @param {string} serverName - Name of the MCP server
 * @param {string} uri - Resource URI
 * @returns {Promise<any>} Resource content
 */
async function access_mcp_resource(serverName, uri) {
    try {
        const response = await axios.post('http://localhost:3001/mcp/resource', {
            server: serverName,
            uri
        });
        return response.data;
    } catch (error) {
        console.error('MCP resource error:', error.response?.data || error.message);
        throw new Error('Failed to access MCP resource');
    }
}

module.exports = {
    use_mcp_tool,
    access_mcp_resource
};
