import React, { useState } from 'react';
import { Modal, Form, Button, Alert, InputGroup, FormControl } from 'react-bootstrap';
import { FaEye, FaEyeSlash, FaCheck, FaTimes, FaGithub } from 'react-icons/fa';
import { addProfile, validateToken, maskToken, deleteProfile, loadProfiles, notifyProfilesUpdated } from '../services/profileService';

const ProfileModal = ({ show, onHide, onProfileAdded, profiles, onProfilesUpdated }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(null); // profileId being deleted

  const handleValidate = async () => {
    if (!token || token.length < 10) {
      setValidationResult(false);
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setError('');

    try {
      const isValid = await validateToken(token);
      setValidationResult(isValid);
      if (!isValid) {
        setError('Token is invalid. Please check your GitHub Personal Access Token.');
      }
    } catch (e) {
      setValidationResult(false);
      setError('Failed to validate token. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) { setError('Please enter a profile name'); return; }
    if (!username.trim()) { setError('Please enter a GitHub username'); return; }
    if (!token.trim()) { setError('Please enter a GitHub token'); return; }

    // Validate if not already confirmed valid
    if (validationResult !== true) {
      setValidating(true);
      try {
        const isValid = await validateToken(token);
        if (!isValid) {
          setError('Token is invalid. Please check your GitHub Personal Access Token.');
          setValidationResult(false);
          setValidating(false);
          return;
        }
        setValidationResult(true);
      } catch (e) {
        setError('Failed to validate token. Please try again.');
        setValidating(false);
        return;
      }
      setValidating(false);
    }

    try {
      const newProfile = await addProfile({ name: name.trim(), username: username.trim(), token: token.trim() });
      setSuccess(`Profile "${newProfile.name}" added successfully!`);
      setName('');
      setUsername('');
      setToken('');
      setValidationResult(null);

      if (onProfileAdded) onProfileAdded(newProfile);

      // Reload profiles list and notify other components
      if (onProfilesUpdated) {
        const updated = await loadProfiles();
        onProfilesUpdated(updated);
      }
      notifyProfilesUpdated();
    } catch (e) {
      setError(e.message || 'Failed to add profile');
    }
  };

  const handleDelete = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    setDeleting(profileId);
    try {
      await deleteProfile(profileId);
      if (onProfilesUpdated) {
        const updated = await loadProfiles();
        onProfilesUpdated(updated);
      }
      notifyProfilesUpdated();
    } catch (e) {
      setError(e.message || 'Failed to delete profile');
    } finally {
      setDeleting(null);
    }
  };

  const handleClose = () => {
    setName('');
    setUsername('');
    setToken('');
    setShowToken(false);
    setValidationResult(null);
    setError('');
    setSuccess('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaGithub className="me-2" />
          Manage GitHub Profiles
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Existing Profiles */}
        {profiles.length > 0 && (
          <div className="mb-4">
            <h6 className="mb-3">Existing Profiles</h6>
            <div className="list-group">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <strong>{profile.name}</strong>
                    <div className="text-muted small">
                      @{profile.username} • {maskToken(profile.tokenMask || profile.token || '')}
                      {profile.source === 'env' && (
                        <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}>
                          Jenkins
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={deleting === profile.id}
                    onClick={() => handleDelete(profile.id)}
                  >
                    {deleting === profile.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              ))}
            </div>
            <hr />
          </div>
        )}

        {/* Add New Profile */}
        <h6 className="mb-3">Add New Profile</h6>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Profile Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Work, Personal, Client A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>GitHub Username</Form.Label>
            <InputGroup>
              <InputGroup.Text>@</InputGroup.Text>
              <FormControl
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>GitHub Personal Access Token</Form.Label>
            <InputGroup>
              <FormControl
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setValidationResult(null);
                }}
              />
              <Button variant="outline-secondary" onClick={() => setShowToken(!showToken)}>
                {showToken ? <FaEyeSlash /> : <FaEye />}
              </Button>
              <Button
                variant={validationResult === true ? 'success' : validationResult === false ? 'danger' : 'outline-secondary'}
                onClick={handleValidate}
                disabled={validating || !token}
              >
                {validating ? 'Validating...' : validationResult === true ? (<><FaCheck /> Valid</>) : validationResult === false ? (<><FaTimes /> Invalid</>) : 'Validate'}
              </Button>
            </InputGroup>
            <Form.Text className="text-muted">
              Create a <strong>Fine-grained personal access token</strong> at{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
                github.com/settings/tokens
              </a>
              {' '}with <strong>Read access to plan</strong> permission.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={!name.trim() || !token.trim() || validating}
        >
          Add Profile
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProfileModal;
