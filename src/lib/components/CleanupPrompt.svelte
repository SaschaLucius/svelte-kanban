<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { kanbanStore } from '../stores/kanbanStore';
  import type { Sticky } from '../types';
  
  export let oldStickies: Sticky[] = [];
  
  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
  
  function handleConfirm() {
    kanbanStore.deleteOldDoneStickies();
    dispatch('confirm');
  }
  
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="modal-overlay">
  <div class="modal">
    <h2>Clean Up Old Stickies</h2>
    <p>
      You have {oldStickies.length} {oldStickies.length === 1 ? 'sticky' : 'stickies'} in the "Done" column 
      that are older than 100 days. Would you like to delete them?
    </p>
    
    {#if oldStickies.length > 0}
      <div class="stickies-list">
        <h3>Stickies to be deleted:</h3>
        <ul>
          {#each oldStickies as sticky}
            <li style="background-color: {sticky.color};">
              {sticky.text}
              <small>Created: {new Date(sticky.createdAt).toLocaleDateString()}</small>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    
    <div class="modal-actions">
      <button class="cancel-btn" on:click={handleCancel}>
        Keep them
      </button>
      <button class="confirm-btn" on:click={handleConfirm}>
        Yes, delete them
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .modal {
    background-color: white;
    border-radius: 10px;
    padding: 25px;
    width: 90%;
    max-width: 550px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
    font-family: 'Comic Sans MS', cursive, sans-serif;
  }
  
  h2 {
    margin-top: 0;
    border-bottom: 2px dashed #eee;
    padding-bottom: 15px;
    font-size: 24px;
    color: #333;
  }
  
  .stickies-list {
    max-height: 250px;
    overflow-y: auto;
    margin: 20px 0;
    padding: 15px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  
  h3 {
    margin-top: 0;
    font-size: 18px;
    color: #555;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  li {
    padding: 12px 15px;
    margin-bottom: 12px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    font-family: 'Comic Sans MS', cursive, sans-serif;
    box-shadow: 1px 2px 5px rgba(0, 0, 0, 0.1);
    transform: rotate(-1deg);
    border-bottom-right-radius: 20px 5px;
  }
  
  li:nth-child(even) {
    transform: rotate(1deg);
  }
  
  small {
    font-size: 12px;
    opacity: 0.7;
    margin-top: 8px;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 15px;
    margin-top: 25px;
  }
  
  .confirm-btn, .cancel-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 600;
    font-family: 'Comic Sans MS', cursive, sans-serif;
    font-size: 16px;
    transition: all 0.2s;
  }
  
  .confirm-btn {
    background-color: #f44336;
    color: white;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  }
  
  .confirm-btn:hover {
    background-color: #e53935;
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
  }
  
  .cancel-btn {
    background-color: #e0e0e0;
    color: #333;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
  }
  
  .cancel-btn:hover {
    background-color: #d0d0d0;
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }
</style> 