import { Group, Object3D } from "three";

export interface CharacterModelParams {
  head: Object3D;
  ear: Object3D;
  body: Object3D;
}

export function buildCharacterModel({ head, ear, body }: CharacterModelParams): Group {
  const model = new Group();

  head = head.getObjectByName("head")?.clone(true) ?? new Group();
  const earLeftAnchor = head.getObjectByName("ear_left");
  const earRightAnchor = head.getObjectByName("ear_right");

  if (earLeftAnchor != null) {
    const earLeft = ear.getObjectByName("ear_left")?.clone(true);
    if (earLeft) {
      earLeft.position.set(0,0,0);

      earLeftAnchor.add(earLeft);
    }
  }
  
  if (earRightAnchor != null) {
    const earRight = ear.getObjectByName("ear_right")?.clone(true);
    if (earRight) {
      earRight.position.set(0,0,0);
      earRightAnchor.add(earRight);
    }    
  }

  body = body.getObjectByName("body")?.clone(true) ?? new Group();
  const headAnchor = body.getObjectByName("head");
  if (headAnchor != null) {
    head.position.set(0,0,0);

    headAnchor.add(head);
  }

  model.add(body);

  return model;
}
