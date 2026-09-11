package com.zamzamcafe.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name="orders")
public class Order {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  private String customerName; private String phone;
  @Column(length=1000) private String address;
  @Column(length=1000) private String notes;
  private String paymentMethod; private String status="NEW";
  private Integer subtotal; private Integer deliveryFee; private Integer total;
  private LocalDateTime createdAt=LocalDateTime.now();
  @OneToMany(mappedBy="order", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER) private List<OrderItem> items=new ArrayList<>();
  public Long getId(){return id;} public void setId(Long id){this.id=id;}
  public String getCustomerName(){return customerName;} public void setCustomerName(String v){customerName=v;}
  public String getName(){return customerName;} public void setName(String v){customerName=v;}
  public String getPhone(){return phone;} public void setPhone(String v){phone=v;}
  public String getAddress(){return address;} public void setAddress(String v){address=v;}
  public String getNotes(){return notes;} public void setNotes(String v){notes=v;}
  public String getPaymentMethod(){return paymentMethod;} public void setPaymentMethod(String v){paymentMethod=v;}
  public String getStatus(){return status;} public void setStatus(String v){status=v;}
  public Integer getSubtotal(){return subtotal;} public void setSubtotal(Integer v){subtotal=v;}
  public Integer getDeliveryFee(){return deliveryFee;} public void setDeliveryFee(Integer v){deliveryFee=v;}
  public Integer getTotal(){return total;} public void setTotal(Integer v){total=v;}
  public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime createdAt){this.createdAt=createdAt;}
  public List<OrderItem> getItems(){return items;} public void setItems(List<OrderItem> items){this.items=items;}
  @PrePersist
  public void prePersist() {
    if (createdAt == null) createdAt = LocalDateTime.now();
    if (status == null || status.isBlank()) status = "NEW";
    if (deliveryFee == null) deliveryFee = 0;
  }
}